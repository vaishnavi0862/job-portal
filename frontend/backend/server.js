const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();

// CORS configuration - Allow all origins
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// OPTIONS pre-flight handler
app.options('*', cors());

// Database connection pool
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'job_portal',
    waitForConnections: true,
    connectionLimit: 10
});

// Test database connection
async function testConnection() {
    try {
        const connection = await db.getConnection();
        console.log('✅ MySQL Connected successfully');
        connection.release();
    } catch (error) {
        console.error('❌ MySQL Connection failed:', error.message);
    }
}
testConnection();

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!' });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============ MIDDLEWARE ============
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
        const [users] = await db.query('SELECT id, email, full_name, role FROM users WHERE id = ?', [decoded.id]);
        
        if (users.length === 0) {
            return res.status(401).json({ message: 'User not found' });
        }
        
        req.user = users[0];
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// ============ AUTH ROUTES ============
// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { fullName, email, password, role } = req.body;
        
        // Check if user exists
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email already registered' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user
        const [result] = await db.query(
            'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
            [fullName, email, hashedPassword, role || 'jobseeker']
        );
        
        res.status(201).json({ 
            message: 'User created successfully',
            userId: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Get user
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const user = users[0];
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // Create token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '7d' }
        );
        
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get current user
app.get('/api/auth/me', authenticate, async (req, res) => {
    res.json({ user: req.user });
});

// ============ JOB ROUTES ============
// Get all jobs (with filters)
app.get('/api/jobs', async (req, res) => {
    try {
        const { search, location, jobType, category } = req.query;
        
        let query = 'SELECT * FROM jobs WHERE 1=1';
        const params = [];
        
        if (search) {
            query += ' AND (title LIKE ? OR company LIKE ? OR description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        if (location) {
            query += ' AND location LIKE ?';
            params.push(`%${location}%`);
        }
        
        if (jobType) {
            query += ' AND job_type = ?';
            params.push(jobType);
        }
        
        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const [jobs] = await db.query(query, params);
        res.json(jobs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single job
app.get('/api/jobs/:id', async (req, res) => {
    try {
        const [jobs] = await db.query('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
        
        if (jobs.length === 0) {
            return res.status(404).json({ message: 'Job not found' });
        }
        
        res.json(jobs[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Post a job (recruiter only)
app.post('/api/jobs', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'recruiter') {
            return res.status(403).json({ message: 'Only recruiters can post jobs' });
        }
        
        const { title, company, location, salary, jobType, category, description, requirements } = req.body;
        
        const [result] = await db.query(
            `INSERT INTO jobs (recruiter_id, title, company, location, salary, job_type, category, description, requirements) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, title, company, location, salary, jobType, category, description, requirements]
        );
        
        res.status(201).json({
            message: 'Job posted successfully',
            jobId: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get recruiter's jobs
app.get('/api/jobs/recruiter/my', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'recruiter') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const [jobs] = await db.query(
            'SELECT * FROM jobs WHERE recruiter_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );
        
        res.json(jobs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============ APPLICATION ROUTES ============
// Apply for a job
app.post('/api/applications', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'jobseeker') {
            return res.status(403).json({ message: 'Only job seekers can apply' });
        }
        
        const { jobId } = req.body;
        
        // Check if already applied
        const [existing] = await db.query(
            'SELECT id FROM applications WHERE job_id = ? AND user_id = ?',
            [jobId, req.user.id]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Already applied for this job' });
        }
        
        // Apply for job
        await db.query(
            'INSERT INTO applications (job_id, user_id) VALUES (?, ?)',
            [jobId, req.user.id]
        );
        
        res.json({ message: 'Application submitted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get my applications
app.get('/api/applications/my', authenticate, async (req, res) => {
    try {
        const [applications] = await db.query(
            `SELECT a.*, j.title, j.company, j.location, j.salary 
             FROM applications a 
             JOIN jobs j ON a.job_id = j.id 
             WHERE a.user_id = ? 
             ORDER BY a.applied_at DESC`,
            [req.user.id]
        );
        
        res.json(applications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get applications for my jobs (recruiter)
app.get('/api/applications/recruiter', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'recruiter') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const [applications] = await db.query(
            `SELECT a.*, j.title as job_title, u.full_name as applicant_name, u.email as applicant_email
             FROM applications a 
             JOIN jobs j ON a.job_id = j.id 
             JOIN users u ON a.user_id = u.id 
             WHERE j.recruiter_id = ? 
             ORDER BY a.applied_at DESC`,
            [req.user.id]
        );
        
        res.json(applications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update application status (recruiter)
app.put('/api/applications/:id/status', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'recruiter') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const { status } = req.body;
        
        await db.query(
            'UPDATE applications SET status = ? WHERE id = ?',
            [status, req.params.id]
        );
        
        res.json({ message: 'Status updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============ SAVED JOBS ROUTES ============

// Save a job (Bookmark)
app.post('/api/jobs/save', authenticate, async (req, res) => {
    try {
        const { jobId } = req.body;
        
        // Check if job exists
        const [jobExists] = await db.query('SELECT id FROM jobs WHERE id = ?', [jobId]);
        if (jobExists.length === 0) {
            return res.status(404).json({ message: 'Job not found' });
        }
        
        // Check if already saved
        const [existing] = await db.query(
            'SELECT id FROM saved_jobs WHERE user_id = ? AND job_id = ?',
            [req.user.id, jobId]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Job already saved' });
        }
        
        // Save the job
        await db.query(
            'INSERT INTO saved_jobs (user_id, job_id) VALUES (?, ?)',
            [req.user.id, jobId]
        );
        
        res.json({ message: 'Job saved successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Remove saved job (Unsave)
app.delete('/api/jobs/save/:jobId', authenticate, async (req, res) => {
    try {
        const { jobId } = req.params;
        
        const [result] = await db.query(
            'DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?',
            [req.user.id, jobId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Saved job not found' });
        }
        
        res.json({ message: 'Job removed from saved' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all saved jobs for current user
app.get('/api/jobs/saved', authenticate, async (req, res) => {
    try {
        const [jobs] = await db.query(
            `SELECT j.* FROM jobs j 
             INNER JOIN saved_jobs s ON j.id = s.job_id 
             WHERE s.user_id = ? 
             ORDER BY s.saved_at DESC`,
            [req.user.id]
        );
        
        res.json(jobs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Check if a job is saved
app.get('/api/jobs/saved/check/:jobId', authenticate, async (req, res) => {
    try {
        const { jobId } = req.params;
        
        const [saved] = await db.query(
            'SELECT id FROM saved_jobs WHERE user_id = ? AND job_id = ?',
            [req.user.id, jobId]
        );
        
        res.json({ isSaved: saved.length > 0 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get count of saved jobs for current user
app.get('/api/jobs/saved/count', authenticate, async (req, res) => {
    try {
        const [result] = await db.query(
            'SELECT COUNT(*) as count FROM saved_jobs WHERE user_id = ?',
            [req.user.id]
        );
        
        res.json({ count: result[0].count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============ START SERVER ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`📡 Test API: http://localhost:${PORT}/api/test`);
    console.log(`📡 Jobs API: http://localhost:${PORT}/api/jobs`);
});
// Sample jobs data
const sampleJobs = [
    {
        id: 1,
        title: "Senior Frontend Developer",
        company: "TechCorp",
        location: "New York, NY",
        salary: "$120,000 - $150,000",
        type: "Full-time",
        category: "Technology",
        logo: "🏢",
        description: "We are looking for an experienced Frontend Developer to join our team. You'll work with React, Vue.js, and modern web technologies.",
        requirements: ["5+ years React experience", "TypeScript", "CSS-in-JS", "Team leadership"]
    },
    {
        id: 2,
        title: "UI/UX Designer",
        company: "Creative Studio",
        location: "Remote",
        salary: "$80,000 - $100,000",
        type: "Remote",
        category: "Design",
        logo: "🎨",
        description: "Join our creative team to design beautiful user interfaces and experiences for our clients.",
        requirements: ["Figma expertise", "Portfolio required", "User research experience", "3+ years experience"]
    },
    {
        id: 3,
        title: "Backend Engineer",
        company: "DataSys",
        location: "San Francisco, CA",
        salary: "$130,000 - $160,000",
        type: "Full-time",
        category: "Technology",
        logo: "⚙️",
        description: "Build scalable backend systems using Node.js and Python.",
        requirements: ["Node.js", "Python", "SQL/NoSQL", "AWS experience"]
    },
    {
        id: 4,
        title: "Product Manager",
        company: "Innovate Inc",
        location: "Austin, TX",
        salary: "$110,000 - $140,000",
        type: "Full-time",
        category: "Management",
        logo: "📱",
        description: "Lead product development from ideation to launch.",
        requirements: ["Agile experience", "Technical background", "Communication skills", "3+ years PM experience"]
    },
    {
        id: 5,
        title: "Marketing Specialist",
        company: "GrowthHub",
        location: "Chicago, IL",
        salary: "$60,000 - $80,000",
        type: "Part-time",
        category: "Marketing",
        logo: "📊",
        description: "Create and execute marketing campaigns across digital channels.",
        requirements: ["SEO/SEM", "Social media marketing", "Analytics", "Content creation"]
    },
    {
        id: 6,
        title: "DevOps Engineer",
        company: "CloudTech",
        location: "Remote",
        salary: "$140,000 - $170,000",
        type: "Remote",
        category: "Technology",
        logo: "☁️",
        description: "Manage cloud infrastructure and CI/CD pipelines.",
        requirements: ["AWS/Azure", "Docker", "Kubernetes", "Terraform"]
    }
];

// Function to load all jobs
function loadAllJobs() {
    const container = document.getElementById('jobsGrid');
    if (!container) return;
    
    container.innerHTML = '';
    
    sampleJobs.forEach(job => {
        container.innerHTML += createJobCard(job);
    });
}

// Function to load featured jobs (only 3)
function loadFeaturedJobs() {
    const container = document.getElementById('jobsGrid');
    if (!container) return;
    
    container.innerHTML = '';
    const featuredJobs = sampleJobs.slice(0, 3);
    
    featuredJobs.forEach(job => {
        container.innerHTML += createJobCard(job);
    });
}

// Function to create job card HTML
function createJobCard(job) {
    return `
        <div class="job-card">
            <div class="job-card-header">
                <div class="job-logo">${job.logo}</div>
                <div class="job-info">
                    <h3>${job.title}</h3>
                    <p class="company-name">${job.company}</p>
                </div>
            </div>
            <div class="job-details">
                <span class="job-location"><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                <span class="job-salary"><i class="fas fa-dollar-sign"></i> ${job.salary}</span>
                <span class="job-type">${job.type}</span>
            </div>
            <div class="job-actions">
                <button onclick="viewJobDetails(${job.id})" class="view-btn">View Details</button>
                <button onclick="applyForJob(${job.id})" class="apply-btn">Apply Now</button>
            </div>
        </div>
    `;
}

// Function to view job details
function viewJobDetails(jobId) {
    const job = sampleJobs.find(j => j.id === jobId);
    if (job) {
        localStorage.setItem('currentJob', JSON.stringify(job));
        window.location.href = `job-details.html?id=${jobId}`;
    }
}

// Function to apply for job
function applyForJob(jobId) {
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (!user) {
        alert('Please login to apply for jobs');
        window.location.href = 'login.html';
        return;
    }
    
    const job = sampleJobs.find(j => j.id === jobId);
    
    if (confirm(`Apply for ${job.title} at ${job.company}?`)) {
        // Check if already applied
        const applications = JSON.parse(localStorage.getItem('applications') || '[]');
        const alreadyApplied = applications.find(app => 
            app.userEmail === user.email && app.jobId === job.id
        );
        
        if (alreadyApplied) {
            alert('You have already applied for this job!');
            return;
        }
        
        // Save application
        applications.push({
            id: Date.now(),
            jobId: job.id,
            jobTitle: job.title,
            company: job.company,
            userEmail: user.email,
            userName: user.fullName,
            appliedAt: new Date().toISOString(),
            status: 'pending'
        });
        
        localStorage.setItem('applications', JSON.stringify(applications));
        alert('Application submitted successfully!');
    }
}

// Function to search jobs
function searchJobs() {
    const urlParams = new URLSearchParams(window.location.search);
    const searchTerm = urlParams.get('search') || '';
    const locationTerm = urlParams.get('location') || '';
    const categoryTerm = urlParams.get('category') || '';
    
    let filteredJobs = sampleJobs;
    
    if (searchTerm) {
        filteredJobs = filteredJobs.filter(job => 
            job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    if (locationTerm) {
        filteredJobs = filteredJobs.filter(job => 
            job.location.toLowerCase().includes(locationTerm.toLowerCase())
        );
    }
    
    if (categoryTerm) {
        filteredJobs = filteredJobs.filter(job => 
            job.category === categoryTerm
        );
    }
    
    const container = document.getElementById('jobsGrid');
    if (container) {
        container.innerHTML = '';
        if (filteredJobs.length === 0) {
            container.innerHTML = '<div class="loading-spinner">No jobs found. Try different keywords!</div>';
        } else {
            filteredJobs.forEach(job => {
                container.innerHTML += createJobCard(job);
            });
        }
    }
}
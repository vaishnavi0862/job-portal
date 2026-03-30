-- ============================================
-- Job Portal Database Schema
-- Database: job_portal
-- ============================================

-- Create Database
CREATE DATABASE IF NOT EXISTS job_portal;
USE job_portal;

-- ============================================
-- Table: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('jobseeker', 'recruiter') DEFAULT 'jobseeker',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table: jobs
-- ============================================
CREATE TABLE IF NOT EXISTS jobs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    recruiter_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    company VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    salary VARCHAR(50),
    description TEXT NOT NULL,
    requirements TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recruiter_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- Table: applications
-- ============================================
CREATE TABLE IF NOT EXISTS applications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_id INT NOT NULL,
    jobseeker_id INT NOT NULL,
    status ENUM('pending', 'reviewed', 'accepted', 'rejected') DEFAULT 'pending',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (jobseeker_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_application (job_id, jobseeker_id)
);

-- ============================================
-- Table: saved_jobs
-- ============================================
CREATE TABLE IF NOT EXISTS saved_jobs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_id INT NOT NULL,
    jobseeker_id INT NOT NULL,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (jobseeker_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_saved (job_id, jobseeker_id)
);

-- ============================================
-- Sample Data (Optional - for testing)
-- ============================================

-- Insert sample users
-- Note: Replace with actual bcrypt hashed passwords
INSERT INTO users (name, email, password, role) VALUES
('Recruiter User', 'recruiter@example.com', '$2b$10$your_hashed_password_here', 'recruiter'),
('Job Seeker User', 'seeker@example.com', '$2b$10$your_hashed_password_here', 'jobseeker');

-- Insert sample jobs
INSERT INTO jobs (recruiter_id, title, company, location, salary, description, requirements) VALUES
(1, 'Frontend Developer', 'Tech Corp', 'Hyderabad', '₹5-8 LPA', 'Looking for a skilled frontend developer with React experience.', 'HTML, CSS, JavaScript, React'),
(1, 'Backend Developer', 'Tech Corp', 'Bangalore', '₹6-10 LPA', 'Node.js developer for API development.', 'Node.js, Express, SQL');
-- Create Database
CREATE DATABASE IF NOT EXISTS ciro_pakistan;
USE ciro_pakistan;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    citizenId VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Master Incidents Table (Common Fields)
CREATE TABLE IF NOT EXISTS incidents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    citizenId VARCHAR(50),
    reporterName VARCHAR(100),
    type ENUM('Urban Flooding', 'Heatwave', 'Road Blockage', 'Power Outage', 'Health', 'Disease Spike', 'Accident') NOT NULL,
    status ENUM('Pending', 'Processing', 'Solved') DEFAULT 'Pending',
    severity ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
    location VARCHAR(255),
    locationUrdu VARCHAR(255),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    time VARCHAR(50),
    confidence FLOAT,
    verified BOOLEAN DEFAULT FALSE,
    infrastructure TEXT,
    details TEXT,
    evidence_type VARCHAR(20),
    evidence_data LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1. Urban Flooding Details
CREATE TABLE IF NOT EXISTS details_flooding (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id INT NOT NULL,
    infrastructure_affected TEXT,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
);

-- 2. Heatwave Details
CREATE TABLE IF NOT EXISTS details_heatwave (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id INT NOT NULL,
    area_location VARCHAR(255),
    heatwave_status ENUM('Low', 'Medium', 'High'),
    has_disease BOOLEAN,
    disease_name VARCHAR(100),
    mitigation_required SET('Water distribution', 'Cooling center', 'Medical camp activity'),
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
);

-- 3. Road Blockage Details
CREATE TABLE IF NOT EXISTS details_road_blockage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id INT NOT NULL,
    blockage_location VARCHAR(255),
    incident_occurred BOOLEAN,
    blockage_details TEXT,
    is_authentic_ai BOOLEAN,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
);

-- 4. Power Outage Details
CREATE TABLE IF NOT EXISTS details_power_outage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id INT NOT NULL,
    voltage_problem ENUM('High voltage', 'Low voltage', 'Complete outage of power supply'),
    duration_hours INT,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
);

-- 5. Medical Health Details
CREATE TABLE IF NOT EXISTS details_health (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id INT NOT NULL,
    medical_problem TEXT,
    illness_duration VARCHAR(100),
    immediate_action ENUM('Ambulance', 'House treatment', 'Medical consult', 'Emergency evacuation'),
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
);

-- 6. Public Disease Spike Details
CREATE TABLE IF NOT EXISTS details_disease_spike (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id INT NOT NULL,
    disease_name VARCHAR(100),
    spike_duration VARCHAR(100),
    people_affected INT,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
);

-- 7. Road Accident Details
CREATE TABLE IF NOT EXISTS details_accident (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id INT NOT NULL,
    accident_type VARCHAR(100),
    accident_location VARCHAR(255),
    accident_time TIME,
    injured_count INT,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
);

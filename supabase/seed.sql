-- ============================================================================
-- RIT ECE PROFESSIONAL NETWORKING PLATFORM
-- Seed Data: supabase/seed.sql
-- Realistic test data matching the RIT ECE department ecosystem
-- ============================================================================

-- Fixed UUIDs for deterministic testing
-- Admin: 00000000-0000-0000-0000-000000000001
-- Alumni 1 (Priya): 00000000-0000-0000-0000-000000000002
-- Student 1 (Kavitha): 00000000-0000-0000-0000-000000000003
-- Student 2 (Rahul): 00000000-0000-0000-0000-000000000004
-- Faculty (Dr. Arunkumar): 00000000-0000-0000-0000-000000000005

-- 1. Insert into auth.users (Supabase Auth Mock)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin@ritchennai.edu.in', crypt('password123', gen_salt('bf')), now(), '{"full_name": "Dr. ECE HOD", "role": "admin"}'),
    ('00000000-0000-0000-0000-000000000002', 'priya.k@ritchennai.edu.in', crypt('password123', gen_salt('bf')), now(), '{"full_name": "Priya Krishnan", "role": "alumni"}'),
    ('00000000-0000-0000-0000-000000000003', 'kavitha.s@ritchennai.edu.in', crypt('password123', gen_salt('bf')), now(), '{"full_name": "Kavitha Sundaram", "role": "student"}'),
    ('00000000-0000-0000-0000-000000000004', 'rahul.m@ritchennai.edu.in', crypt('password123', gen_salt('bf')), now(), '{"full_name": "Rahul Manikandan", "role": "student"}'),
    ('00000000-0000-0000-0000-000000000005', 'arunkumar.v@ritchennai.edu.in', crypt('password123', gen_salt('bf')), now(), '{"full_name": "Dr. V. Arunkumar", "role": "faculty"}')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Profiles
INSERT INTO public.profiles (id, email, full_name, headline, bio, role, verification_status, batch_year, graduation_year, current_company, current_position, location)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin@ritchennai.edu.in', 'Dr. ECE HOD', 'Head of Department, ECE | Rajalakshmi Institute of Technology', 'Leading educational innovation, research grants, and industry collaborations at RIT Chennai ECE Department.', 'admin', 'verified', 2010, 2014, 'Rajalakshmi Institute of Technology', 'Professor & HOD', 'Chennai, Tamil Nadu'),
    ('00000000-0000-0000-0000-000000000002', 'priya.k@ritchennai.edu.in', 'Priya Krishnan', 'Senior Silicon Design Engineer @ Intel | RIT ECE 2019 Batch', 'Specializing in RTL Design, SystemVerilog, UVM verification, and low-power ASIC architectures.', 'alumni', 'verified', 2015, 2019, 'Intel Corporation', 'Senior Silicon Design Engineer', 'Bengaluru, Karnataka'),
    ('00000000-0000-0000-0000-000000000003', 'kavitha.s@ritchennai.edu.in', 'Kavitha Sundaram', 'Final Year ECE Student @ RIT | VLSI & Embedded Systems Enthusiast', 'Passionate about FPGA prototyping, RISC-V core development, and TinyML on edge microcontrollers.', 'student', 'verified', 2021, 2025, 'Student', 'Undergraduate Researcher', 'Chennai, Tamil Nadu'),
    ('00000000-0000-0000-0000-000000000004', 'rahul.m@ritchennai.edu.in', 'Rahul Manikandan', '3rd Year ECE @ RIT | Robotics, ROS2 & Autonomous Systems', 'Building autonomous mobile robots, computer vision pipelines, and IoT sensor arrays.', 'student', 'verified', 2022, 2026, 'Student', 'Robotics Club Lead', 'Chennai, Tamil Nadu'),
    ('00000000-0000-0000-0000-000000000005', 'arunkumar.v@ritchennai.edu.in', 'Dr. V. Arunkumar', 'Associate Professor, ECE | VLSI & Nanotechnology Center Head', 'Faculty mentor guiding students in national hackathons, IEEE conferences, and MSME incubation grants.', 'faculty', 'verified', 2012, 2016, 'Rajalakshmi Institute of Technology', 'Associate Professor', 'Chennai, Tamil Nadu')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    headline = EXCLUDED.headline,
    role = EXCLUDED.role,
    verification_status = EXCLUDED.verification_status;

-- 3. Insert User Roles
INSERT INTO public.user_roles (user_id, role)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin'),
    ('00000000-0000-0000-0000-000000000002', 'alumni'),
    ('00000000-0000-0000-0000-000000000003', 'student'),
    ('00000000-0000-0000-0000-000000000004', 'student'),
    ('00000000-0000-0000-0000-000000000005', 'faculty')
ON CONFLICT DO NOTHING;

-- 4. Insert Communities
INSERT INTO public.communities (id, name, slug, description, category, creator_id)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'VLSI & Chip Design Circle', 'vlsi-chip-design', 'Silicon design, RTL coding, Synthesis, Cadence EDA, and Physical Design discussions.', 'Technical Circle', '00000000-0000-0000-0000-000000000005'),
    ('10000000-0000-0000-0000-000000000002', 'Embedded Systems & IoT Club', 'embedded-iot-club', 'STM32, ESP32, RTOS, PCB layout, and industrial sensor integration.', 'Technical Circle', '00000000-0000-0000-0000-000000000003'),
    ('10000000-0000-0000-0000-000000000003', 'Robotics & Automation Wing', 'robotics-automation', 'ROS2, drone avionics, path planning, and autonomous ground vehicles.', 'Technical Circle', '00000000-0000-0000-0000-000000000004'),
    ('10000000-0000-0000-0000-000000000004', 'Core Placement & GATE ECE Prep', 'core-placement-gate', 'Alumni mentorship, interview experiences from Qualcomm, TI, Intel, and GATE study material.', 'Career & Mentorship', '00000000-0000-0000-0000-000000000002')
ON CONFLICT (slug) DO NOTHING;

-- 5. Insert Sample Posts
INSERT INTO public.posts (id, author_id, content, tags, visibility, likes_count, comments_count)
VALUES
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Excited to announce that Intel Bangalore is kicking off fresh engineering hiring for our Physical Design and DFT teams! Proud to see multiple RIT ECE graduates excelling in our semiconductor units. Feel free to connect for referrals.', ARRAY['#VLSI', '#Semiconductor', '#Intel', '#RITECE', '#AlumniReferral'], 'public', 12, 3),
    ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Successfully synthesized a 5-stage pipelined 32-bit RISC-V processor core on the Xilinx Artix-7 FPGA board in our RIT ECE Advanced VLSI Lab. Verified instruction execution with benchmark suites!', ARRAY['#RISCV', '#FPGA', '#SystemVerilog', '#OpenSourceHardware'], 'public', 8, 2),
    ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Hearty congratulations to the RIT ECE Smart India Hackathon finalists! The department incubation cell will provide ₹50,000 prototype funding for top embedded solutions.', ARRAY['#RITChennai', '#ECE', '#Hackathon', '#Incubation'], 'public', 24, 4)
ON CONFLICT (id) DO NOTHING;

-- 6. Insert Sample Jobs
INSERT INTO public.jobs (id, posted_by, title, company, location, is_remote, job_type, domain, description, is_alumni_referral, application_url)
VALUES
    ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Associate ASIC Verification Engineer', 'Intel Corporation', 'Bengaluru, Karnataka', false, 'full_time', 'VLSI / Semiconductor', 'Seeking 2024/2025 ECE graduates with strong knowledge of SystemVerilog, UVM, and digital design fundamentals.', true, 'https://jobs.intel.com'),
    ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 'Embedded Firmware Engineering Intern', 'Bosch Global Software Technologies', 'Coimbatore, Tamil Nadu', false, 'internship', 'Embedded Systems', '6-month internship on Automotive CAN/LIN bus protocols and FreeRTOS microcontroller development.', false, 'https://bosch.com/careers')
ON CONFLICT (id) DO NOTHING;

-- 7. Insert Sample Hackathons
INSERT INTO public.hackathons (id, created_by, title, organizer, description, theme, prize_pool, event_start_date, event_end_date, registration_url, is_incubation_program)
VALUES
    ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'RIT InnoVate Hardware Hackathon 2026', 'RIT ECE Department & IEEE Student Branch', 'Annual 36-hour flagship hardware buildathon focused on edge computing, renewable energy sensors, and assistive robotics.', 'Smart Hardware & IoT', '₹1,50,000 Cash + Incubation Support', now() + interval '14 days', now() + interval '16 days', 'https://ritchennai.org/innovate2026', false)
ON CONFLICT (id) DO NOTHING;

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase, getDb, insert, findOne, saveDbSync } from './schema.js';

async function seed() {
  initDatabase();
  const db = getDb();
  
  // Only seed if no users exist
  if (db.users.length > 0) {
    console.log('Database already has data. Skipping seed.');
    return;
  }

  console.log('🌱 Seeding database...');
  const password = await bcrypt.hash('password123', 12);
  const now = new Date().toISOString();

  // Admin
  const admin = {
    id: uuidv4(), email: 'admin@ritchennai.edu.in', personal_email: '', password,
    full_name: 'Admin RIT ECE', phone: '9876543210', role: 'admin', account_type: 'student',
    register_number: 'ADMIN001', batch: '2024', year: '4', section: 'A', department: 'ECE',
    graduation_year: '', profile_photo: '', cover_photo: '', headline: 'Platform Administrator',
    bio: 'Administrator of RIT ECE Professional Network', date_of_birth: '', gender: '',
    location: 'Chennai, Tamil Nadu', current_company: 'RIT', job_title: 'Admin',
    industry: 'Education', github: '', linkedin: '', portfolio: '', twitter: '', resume: '',
    verification_status: 'verified', is_active: 1, is_suspended: 0, profile_completion: 70,
    privacy_profile: 'everyone', privacy_email: 'connections', privacy_phone: 'only_me',
    privacy_message: 'everyone', privacy_connection: 'everyone',
    mentoring_available: 0, mentoring_career: 0, mentoring_referrals: 0,
    mentoring_projects: 0, mentoring_lectures: 0, theme: 'system',
    last_active: now, created_at: now, updated_at: now,
  };
  insert('users', admin);

  // Sample students
  const studentData = [
    { name: 'Arjun Krishnamoorthy', email: 'arjun.k@ritchennai.edu.in', batch: '2025', year: '3', section: 'A', headline: 'ECE Student | Embedded Systems Enthusiast', bio: 'Passionate about embedded systems and IoT. Currently working on smart agriculture projects.', location: 'Chennai', skills: ['C', 'C++', 'Python', 'Arduino', 'Embedded C', 'VHDL', 'IoT'], github: 'https://github.com/arjunk' },
    { name: 'Priya Venkatesh', email: 'priya.v@ritchennai.edu.in', batch: '2025', year: '3', section: 'A', headline: 'AI/ML Enthusiast | ECE Student', bio: 'Exploring the intersection of machine learning and signal processing. Research intern at IIT Madras.', location: 'Chennai', skills: ['Python', 'TensorFlow', 'MATLAB', 'Signal Processing', 'Deep Learning', 'OpenCV'], github: 'https://github.com/priyav' },
    { name: 'Karthik Raman', email: 'karthik.r@ritchennai.edu.in', batch: '2026', year: '2', section: 'B', headline: 'VLSI Design | Digital Electronics', bio: 'Aspiring VLSI engineer with a focus on digital circuit design and verification.', location: 'Chennai', skills: ['Verilog', 'VHDL', 'Cadence', 'Xilinx', 'FPGA', 'Digital Design'], github: '' },
    { name: 'Divya Lakshmi', email: 'divya.l@ritchennai.edu.in', batch: '2026', year: '2', section: 'A', headline: 'Web Developer | ECE Student', bio: 'Building full-stack applications and exploring cloud technologies alongside my ECE curriculum.', location: 'Chennai', skills: ['React', 'Node.js', 'JavaScript', 'Python', 'MongoDB', 'AWS'], github: 'https://github.com/divyal' },
    { name: 'Rahul Sharma', email: 'rahul.s@ritchennai.edu.in', batch: '2024', year: '4', section: 'A', headline: 'Robotics | Automation | ECE Final Year', bio: 'Building autonomous robots. Winner of Smart India Hackathon 2023.', location: 'Chennai', skills: ['ROS', 'Python', 'C++', 'OpenCV', 'PCB Design', 'Robotics', '3D Printing'], github: 'https://github.com/rahuls' },
    { name: 'Sneha Nair', email: 'sneha.n@ritchennai.edu.in', batch: '2027', year: '1', section: 'A', headline: 'First Year ECE Student | Eager Learner', bio: 'Just started my ECE journey. Excited to learn about electronics and programming!', location: 'Chennai', skills: ['C', 'Python', 'Electronics Basics'], github: '' },
    { name: 'Vikram Sundaram', email: 'vikram.s@ritchennai.edu.in', batch: '2025', year: '3', section: 'B', headline: 'Cybersecurity Enthusiast | ECE Student', bio: 'Interested in hardware security and cryptographic implementations on FPGA.', location: 'Chennai', skills: ['Network Security', 'Cryptography', 'FPGA', 'Python', 'Linux', 'Ethical Hacking'], github: 'https://github.com/vikrams' },
    { name: 'Meera Rajendran', email: 'meera.r@ritchennai.edu.in', batch: '2024', year: '4', section: 'B', headline: 'Communication Systems | Research Aspirant', bio: 'Researching 5G antenna design. Published paper in IEEE conference.', location: 'Chennai', skills: ['MATLAB', 'HFSS', 'Antenna Design', '5G', 'Communication Systems', 'Signal Processing'], github: '' },
  ];

  const studentIds = [];
  for (const s of studentData) {
    const id = uuidv4();
    studentIds.push(id);
    insert('users', {
      id, email: s.email, personal_email: '', password,
      full_name: s.name, phone: '', role: 'user', account_type: 'student',
      register_number: `RIT${Math.floor(1000 + Math.random() * 9000)}`, batch: s.batch, year: s.year,
      section: s.section, department: 'ECE', graduation_year: '', profile_photo: '', cover_photo: '',
      headline: s.headline, bio: s.bio, date_of_birth: '', gender: '', location: s.location,
      current_company: '', job_title: '', industry: '', github: s.github, linkedin: '', portfolio: '',
      twitter: '', resume: '', verification_status: 'verified', is_active: 1, is_suspended: 0,
      profile_completion: 65, privacy_profile: 'everyone', privacy_email: 'connections',
      privacy_phone: 'only_me', privacy_message: 'everyone', privacy_connection: 'everyone',
      mentoring_available: 0, mentoring_career: 0, mentoring_referrals: 0,
      mentoring_projects: 0, mentoring_lectures: 0, theme: 'system',
      last_active: now, created_at: now, updated_at: now,
    });
    
    // Add skills
    s.skills.forEach(skill => {
      insert('skills', { id: uuidv4(), user_id: id, name: skill, endorsement_count: Math.floor(Math.random() * 10), created_at: now });
    });
    
    // Add education
    insert('education', {
      id: uuidv4(), user_id: id, institution: 'Rajalakshmi Institute of Technology',
      degree: 'B.E.', department: 'Electronics and Communication Engineering',
      start_year: String(parseInt(s.batch) - 4), end_year: s.batch, description: '', created_at: now,
    });
  }

  // Sample alumni
  const alumniData = [
    { name: 'Dr. Suresh Kumar', email: 'suresh.k@gmail.com', graduation_year: '2018', company: 'Google', title: 'Senior Software Engineer', industry: 'Technology', location: 'Bangalore', headline: 'Senior SWE at Google | RIT ECE Alumni \'18', bio: 'RIT ECE graduate passionate about distributed systems. Happy to mentor students.', skills: ['Java', 'Go', 'Distributed Systems', 'Cloud Computing', 'System Design'], mentoring: 1 },
    { name: 'Ananya Pillai', email: 'ananya.p@outlook.com', graduation_year: '2020', company: 'Texas Instruments', title: 'Analog Design Engineer', industry: 'Semiconductors', location: 'Bangalore', headline: 'Analog IC Designer at TI | RIT ECE \'20', bio: 'Working on power management ICs. Love helping juniors prepare for core placements.', skills: ['Analog Design', 'Cadence Virtuoso', 'SPICE', 'Layout', 'CMOS'], mentoring: 1 },
    { name: 'Rajesh Iyer', email: 'rajesh.i@yahoo.com', graduation_year: '2019', company: 'Amazon', title: 'Solutions Architect', industry: 'Cloud Computing', location: 'Hyderabad', headline: 'Solutions Architect at AWS | RIT ECE \'19', bio: 'From ECE to cloud — my journey through tech. Open to connect with RIT juniors!', skills: ['AWS', 'Terraform', 'Docker', 'Kubernetes', 'Python', 'Networking'], mentoring: 1 },
    { name: 'Kavitha Natarajan', email: 'kavitha.n@gmail.com', graduation_year: '2017', company: 'Qualcomm', title: 'Staff Engineer - 5G', industry: 'Telecom', location: 'Chennai', headline: '5G Modem Engineer at Qualcomm | RIT ECE \'17', bio: 'Working on cutting-edge 5G modem firmware. Published 3 patents in wireless communication.', skills: ['5G NR', 'LTE', 'C', 'Embedded Systems', 'Wireless Communication', 'DSP'], mentoring: 1 },
    { name: 'Arun Prakash', email: 'arun.p@hotmail.com', graduation_year: '2021', company: 'Zoho', title: 'Product Engineer', industry: 'SaaS', location: 'Chennai', headline: 'Product Engineer at Zoho | RIT ECE \'21', bio: 'Building enterprise products at Zoho. Ex-intern at Infosys.', skills: ['Java', 'React', 'PostgreSQL', 'System Design', 'REST APIs'], mentoring: 0 },
  ];

  const alumniIds = [];
  for (const a of alumniData) {
    const id = uuidv4();
    alumniIds.push(id);
    insert('users', {
      id, email: a.email, personal_email: '', password,
      full_name: a.name, phone: '', role: 'user', account_type: 'alumni',
      register_number: '', batch: a.graduation_year, year: '', section: '', department: 'ECE',
      graduation_year: a.graduation_year, profile_photo: '', cover_photo: '',
      headline: a.headline, bio: a.bio, date_of_birth: '', gender: '', location: a.location,
      current_company: a.company, job_title: a.title, industry: a.industry,
      github: '', linkedin: '', portfolio: '', twitter: '', resume: '',
      verification_status: 'verified', is_active: 1, is_suspended: 0, profile_completion: 75,
      privacy_profile: 'everyone', privacy_email: 'connections', privacy_phone: 'only_me',
      privacy_message: 'everyone', privacy_connection: 'everyone',
      mentoring_available: a.mentoring, mentoring_career: a.mentoring, mentoring_referrals: a.mentoring,
      mentoring_projects: a.mentoring, mentoring_lectures: 0, theme: 'system',
      last_active: now, created_at: now, updated_at: now,
    });
    
    a.skills.forEach(skill => {
      insert('skills', { id: uuidv4(), user_id: id, name: skill, endorsement_count: Math.floor(Math.random() * 20), created_at: now });
    });
    
    insert('education', {
      id: uuidv4(), user_id: id, institution: 'Rajalakshmi Institute of Technology',
      degree: 'B.E.', department: 'Electronics and Communication Engineering',
      start_year: String(parseInt(a.graduation_year) - 4), end_year: a.graduation_year, description: '', created_at: now,
    });
    
    insert('experience', {
      id: uuidv4(), user_id: id, company: a.company, position: a.title,
      employment_type: 'full-time', start_date: a.graduation_year, end_date: '',
      location: a.location, description: '', is_current: 1, created_at: now,
    });
  }

  // Sample connections
  const allUserIds = [...studentIds, ...alumniIds];
  for (let i = 0; i < allUserIds.length; i++) {
    for (let j = i + 1; j < allUserIds.length; j++) {
      if (Math.random() > 0.6) {
        insert('connections', {
          id: uuidv4(), sender_id: allUserIds[i], receiver_id: allUserIds[j],
          status: 'accepted', created_at: now, updated_at: now,
        });
      }
    }
  }

  // Sample posts
  const postContents = [
    { content: '🎉 Excited to share that I\'ve been selected for the Smart India Hackathon 2024! Our team "CircuitBreakers" will be working on a smart grid monitoring system. Any tips from seniors who\'ve participated before? #SIH2024 #ECE #RIT', type: 'text' },
    { content: 'Just completed my final year project on "AI-based PCB Defect Detection using Computer Vision". The system achieved 97.3% accuracy! Huge thanks to my guide Prof. Ramesh for the constant support. 🔬\n\nTechnologies used: Python, OpenCV, TensorFlow, Raspberry Pi\n\n#FinalYearProject #ComputerVision #ECE', type: 'achievement' },
    { content: '📢 Internship Alert!\n\nTexas Instruments is hiring ECE interns for Summer 2024. Roles available:\n- Analog Design Intern\n- Digital Verification Intern\n- Test Engineering Intern\n\nLocation: Bangalore\nStipend: ₹40,000-60,000/month\n\nApply before Nov 30. DM me for referrals! 💼', type: 'text' },
    { content: 'Attended an amazing workshop on "RISC-V Processor Design" organized by the ECE department today. Built a basic 5-stage pipeline processor in Verilog! The future of open-source hardware is exciting. 🖥️\n\n#RISCV #VLSIDesign #Workshop', type: 'text' },
    { content: 'Proud to announce that our research paper "Energy-Efficient Routing Protocol for IoT Networks using Reinforcement Learning" has been accepted at IEEE CONECCT 2024! 📄✨\n\nFirst publication as a UG student — couldn\'t be happier! Thanks to my co-authors and Prof. Lakshmi.\n\n#Research #IEEE #IoT #ReinforcementLearning', type: 'achievement' },
    { content: 'Tips for juniors preparing for placement season:\n\n1️⃣ Start DSA early (at least 6 months before)\n2️⃣ Build 2-3 solid projects\n3️⃣ Practice aptitude daily\n4️⃣ Work on communication skills\n5️⃣ Get your resume reviewed by seniors/alumni\n6️⃣ Attend mock interviews\n7️⃣ Don\'t ignore core ECE subjects\n\nGood luck, batch of 2025! 💪', type: 'text' },
    { content: '🏆 Won 2nd place at HackFest 2024 organized by IIT Madras!\n\nOur project: A wearable health monitoring device using ESP32 that tracks vitals and predicts anomalies using TinyML.\n\nTeam: Arjun K, Priya V, Vikram S\nPrize: ₹50,000\n\nAmazing experience competing against 200+ teams! #Hackathon #IoT #TinyML', type: 'achievement' },
    { content: 'Looking for study partners for GATE 2025 preparation! I\'m focusing on:\n- Signals & Systems\n- Control Systems\n- Digital Electronics\n- Network Theory\n\nPlanning to form a study group. Interested people, drop a comment! 📚\n\n#GATE2025 #ECE', type: 'text' },
  ];

  postContents.forEach((p, index) => {
    const userId = allUserIds[index % allUserIds.length];
    const postId = uuidv4();
    const daysAgo = Math.floor(Math.random() * 14);
    const postDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    
    insert('posts', {
      id: postId, user_id: userId, content: p.content, post_type: p.type,
      media: '', is_pinned: 0, is_announcement: 0, community_id: null,
      likes_count: Math.floor(Math.random() * 25), comments_count: Math.floor(Math.random() * 8),
      shares_count: Math.floor(Math.random() * 5), created_at: postDate, updated_at: postDate,
    });
    
    // Add some reactions
    for (let i = 0; i < Math.floor(Math.random() * 5); i++) {
      const reactorId = allUserIds[Math.floor(Math.random() * allUserIds.length)];
      if (reactorId !== userId) {
        insert('reactions', {
          id: uuidv4(), user_id: reactorId, post_id: postId,
          type: ['like', 'celebrate', 'support', 'insightful', 'interesting'][Math.floor(Math.random() * 5)],
          created_at: postDate,
        });
      }
    }
    
    // Add some comments
    if (Math.random() > 0.4) {
      const commentorId = allUserIds[Math.floor(Math.random() * allUserIds.length)];
      insert('comments', {
        id: uuidv4(), user_id: commentorId, post_id: postId, parent_id: null,
        content: ['Great work! Keep it up! 👏', 'This is really inspiring!', 'Congrats! Well deserved 🎉', 'Very helpful, thanks for sharing!', 'Amazing achievement! Proud of you!'][Math.floor(Math.random() * 5)],
        created_at: postDate,
      });
    }
  });

  // Sample jobs
  const jobsData = [
    { title: 'Embedded Software Engineer', company: 'Robert Bosch', location: 'Bangalore', work_mode: 'onsite', employment_type: 'full-time', experience: '0-2 years', salary_min: '600000', salary_max: '1200000', skills: 'C, Embedded C, RTOS, ARM, CAN Protocol', description: 'Design and develop embedded software for automotive ECUs. Work with cross-functional teams on ADAS features.', eligibility: 'B.E./B.Tech in ECE/EEE with strong embedded programming skills', deadline: '2024-12-15' },
    { title: 'VLSI Design Intern', company: 'Intel', location: 'Bangalore', work_mode: 'hybrid', employment_type: 'internship', experience: 'Fresher', salary_min: '35000', salary_max: '50000', skills: 'Verilog, SystemVerilog, UVM, Digital Design', description: '6-month internship in digital design verification team. Work on next-gen processor verification.', eligibility: 'Pre-final year B.E./B.Tech ECE students', deadline: '2024-11-30' },
    { title: 'IoT Solutions Developer', company: 'Wipro', location: 'Chennai', work_mode: 'hybrid', employment_type: 'full-time', experience: '0-1 years', salary_min: '450000', salary_max: '700000', skills: 'Python, MQTT, AWS IoT, ESP32, Node-RED', description: 'Develop end-to-end IoT solutions for industrial clients. Design sensor networks and cloud dashboards.', eligibility: 'B.E./B.Tech graduates with IoT project experience', deadline: '2024-12-20' },
    { title: 'Machine Learning Engineer Intern', company: 'Samsung R&D', location: 'Bangalore', work_mode: 'onsite', employment_type: 'internship', experience: 'Fresher', salary_min: '40000', salary_max: '60000', skills: 'Python, PyTorch, TensorFlow, Computer Vision, NLP', description: 'Work on on-device AI models for Samsung flagship devices. Focus on model optimization and quantization.', eligibility: 'Pre-final/Final year students with ML project experience', deadline: '2024-11-25' },
    { title: 'RF Design Engineer', company: 'Qualcomm', location: 'Chennai', work_mode: 'onsite', employment_type: 'full-time', experience: '0-2 years', salary_min: '800000', salary_max: '1500000', skills: 'RF Design, ADS, HFSS, Antenna Design, 5G', description: 'Design RF front-end modules for 5G modem chipsets. Work on filter design and impedance matching.', eligibility: 'B.E./M.E. in ECE with RF/Microwave background', deadline: '2024-12-10' },
  ];

  jobsData.forEach(j => {
    insert('jobs', {
      id: uuidv4(), posted_by: admin.id, ...j,
      company_logo: '', application_link: '#', contact_email: 'careers@company.com',
      is_active: 1, created_at: now, updated_at: now,
    });
  });

  // Sample hackathons
  const hackathonsData = [
    { name: 'Smart India Hackathon 2024', organization: 'Ministry of Education, Govt. of India', description: 'National level hackathon to solve real-world problems using technology. 48-hour coding sprint with mentoring from industry experts.', date_start: '2024-12-14', date_end: '2024-12-15', registration_deadline: '2024-11-30', prize_pool: '₹1,00,000 per problem statement', mode: 'offline', location: 'Various nodal centers', eligibility: 'All engineering students', themes: 'Smart Automation, Healthcare, Renewable Energy, Agriculture, Smart Vehicles', technologies: 'AI/ML, IoT, Blockchain, AR/VR', team_size: '6 members', registration_link: 'https://sih.gov.in' },
    { name: 'HackTech 2024 - IIT Bombay', organization: 'Techfest IIT Bombay', description: 'Build innovative hardware+software solutions in 36 hours. Special track for ECE students.', date_start: '2024-12-20', date_end: '2024-12-21', registration_deadline: '2024-12-10', prize_pool: '₹3,00,000', mode: 'offline', location: 'IIT Bombay, Mumbai', eligibility: 'UG and PG students', themes: 'IoT, Embedded Systems, Signal Processing, Sustainability', technologies: 'Arduino, Raspberry Pi, FPGA, Python', team_size: '2-4 members', registration_link: '#' },
  ];

  hackathonsData.forEach(h => {
    insert('hackathons', { id: uuidv4(), posted_by: admin.id, ...h, banner: '', is_active: 1, created_at: now });
  });

  // Sample incubation programs
  insert('incubation_programs', {
    id: uuidv4(), posted_by: admin.id, name: 'RIT Innovation Lab Incubation Program',
    organization: 'RIT Innovation & Entrepreneurship Cell', description: 'A 6-month incubation program for student startups. Get access to lab facilities, mentoring, and seed funding.',
    duration: '6 months', application_deadline: '2024-12-31',
    eligibility: 'Any RIT student team with a viable tech idea',
    benefits: 'Lab access, mentoring, ₹50,000 seed fund, IP support',
    mentorship: 'Industry mentors and faculty advisors', funding: 'Up to ₹50,000 seed funding',
    workspace: 'Dedicated workspace in RIT Innovation Lab', training: 'Business model canvas, pitching, product development',
    application_link: '#', banner: '', is_active: 1, created_at: now,
  });

  // Sample communities
  const communitiesData = [
    { name: 'AI & Machine Learning', description: 'Discuss AI/ML research, projects, and career opportunities. Share papers, tutorials, and resources.', category: 'Technology', icon: '🤖' },
    { name: 'Embedded Systems & IoT', description: 'Everything about microcontrollers, embedded programming, IoT platforms, and hardware projects.', category: 'Technology', icon: '🔌' },
    { name: 'VLSI & Chip Design', description: 'For students interested in VLSI design, verification, and semiconductor industry careers.', category: 'Technology', icon: '🔬' },
    { name: 'Competitive Programming', description: 'Practice DSA, share solutions, and prepare for coding competitions and placement tests.', category: 'Coding', icon: '💻' },
    { name: 'Placement Preparation', description: 'Share placement experiences, aptitude tips, interview questions, and company-specific preparation strategies.', category: 'Career', icon: '🎯' },
    { name: 'Research & Publications', description: 'For students pursuing research. Discuss papers, conferences, and research methodologies.', category: 'Academic', icon: '📄' },
    { name: 'Robotics & Automation', description: 'Build robots, discuss automation, share ROS tutorials, and collaborate on robotics projects.', category: 'Technology', icon: '🤖' },
    { name: 'Entrepreneurship & Startups', description: 'For aspiring entrepreneurs. Discuss startup ideas, business models, funding, and incubation.', category: 'Business', icon: '🚀' },
  ];

  communitiesData.forEach(c => {
    const communityId = uuidv4();
    insert('communities', {
      id: communityId, ...c, cover_image: '', rules: 'Be respectful. No spam. Stay on topic.',
      created_by: admin.id, member_count: Math.floor(5 + Math.random() * 30), is_approved: 1, created_at: now,
    });
    insert('community_members', {
      id: uuidv4(), community_id: communityId, user_id: admin.id, role: 'admin', created_at: now,
    });
    // Add some random members
    for (let i = 0; i < Math.floor(3 + Math.random() * 5); i++) {
      const userId = allUserIds[Math.floor(Math.random() * allUserIds.length)];
      if (!findOne('community_members', { community_id: communityId, user_id: userId })) {
        insert('community_members', {
          id: uuidv4(), community_id: communityId, user_id: userId, role: 'member', created_at: now,
        });
      }
    }
  });

  // Sample events
  const eventsData = [
    { title: 'ECE Technical Symposium 2024', description: 'Annual technical symposium featuring paper presentations, project exhibitions, and workshops.', event_type: 'technical', organizer: 'ECE Department, RIT', date: '2024-12-05', time: '9:00 AM - 5:00 PM', location: 'RIT Main Auditorium', registration_link: '#', agenda: 'Paper Presentation, Project Exhibition, Technical Quiz, Guest Lecture' },
    { title: 'Alumni Interaction Session - Career in Semiconductors', description: 'Interactive session with RIT ECE alumni working in the semiconductor industry. Learn about career paths, skills required, and tips.', event_type: 'seminar', organizer: 'ECE Alumni Cell', date: '2024-11-28', time: '3:00 PM - 5:00 PM', location: 'Online (Google Meet)', registration_link: '#', agenda: 'Alumni talks, Q&A, Networking' },
    { title: 'Workshop: PCB Design using KiCad', description: 'Hands-on workshop on designing PCBs using open-source KiCad. Learn schematic capture, layout, and fabrication.', event_type: 'workshop', organizer: 'ECE Lab, RIT', date: '2024-12-12', time: '10:00 AM - 4:00 PM', location: 'ECE Lab 301', registration_link: '#', agenda: 'Schematic Design, Layout, Gerber Generation, Fabrication Overview' },
  ];

  eventsData.forEach(e => {
    insert('events', { id: uuidv4(), posted_by: admin.id, ...e, banner: '', is_active: 1, created_at: now });
  });

  // Sample announcements
  insert('announcements', {
    id: uuidv4(), posted_by: admin.id, title: 'Placement Season 2024-25 Schedule Released',
    content: 'The placement schedule for the academic year 2024-25 has been released. All eligible students are requested to update their profiles and resumes on the RIT ECE platform. Companies visiting include TCS, Infosys, Wipro, Bosch, TI, and more.',
    image: '', attachment: '', priority: 'high', publish_date: now, expiry_date: '', is_active: 1, created_at: now,
  });

  insert('announcements', {
    id: uuidv4(), posted_by: admin.id, title: 'ECE Department Fest - CIRCUITRIX 2024',
    content: 'The annual ECE department fest CIRCUITRIX 2024 is here! Events include Circuit Design Competition, Robo Race, Tech Quiz, Project Exhibition, and more. Register now!',
    image: '', attachment: '', priority: 'normal', publish_date: now, expiry_date: '', is_active: 1, created_at: now,
  });

  // Sample workshops
  insert('workshops', {
    id: uuidv4(), posted_by: admin.id, title: 'Hands-on with FPGA Programming',
    speaker: 'Prof. Arun Kumar, ECE Department', description: 'Learn FPGA programming using Xilinx Vivado. Topics: VHDL basics, combinational/sequential circuits, and FSM design on Artix-7 board.',
    date: '2024-12-08', time: '10:00 AM - 4:00 PM', location: 'VLSI Lab, RIT',
    mode: 'offline', registration_link: '#', banner: '', is_active: 1, created_at: now,
  });

  saveDbSync();
  console.log('✅ Database seeded successfully!');
  console.log(`   - ${studentData.length} students`);
  console.log(`   - ${alumniData.length} alumni`);
  console.log(`   - 1 admin (admin@ritchennai.edu.in / password123)`);
  console.log(`   - ${postContents.length} posts`);
  console.log(`   - ${jobsData.length} jobs`);
  console.log(`   - ${hackathonsData.length} hackathons`);
  console.log(`   - ${communitiesData.length} communities`);
  console.log(`   - ${eventsData.length} events`);
}

seed().catch(console.error);

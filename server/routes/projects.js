import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { findAll, findById, findOne, insert, update, remove } from '../db/schema.js';

const router = express.Router();

// Initial high-quality ECE Project Bank seed data
const initialECEProjects = [
  {
    id: 'proj-001',
    user_id: '1808a854-7d43-4f36-8d56-641e3393416f', // Arjun K
    title: 'Smart EV Battery Management System (BMS) with CAN Bus & Edge AI',
    domain: 'Embedded Systems & IoT',
    description: 'Hardware prototype of a 48V Lithium-ion BMS utilizing STM32 microcontroller and CAN bus telemetry. Implements an Edge AI model for real-time State-of-Charge (SoC) and State-of-Health (SoH) thermal runaway prediction.',
    hardware_specs: 'STM32F407, BQ76952 AFE, CAN Transceiver, ESP32 Gateway, Current Shunt Amplifier',
    github_url: 'https://github.com/ritece/ev-bms-edge-ai',
    demo_url: 'https://youtu.be/rit-bms-demo',
    team_members: ['Arjun Krishnamoorthy (Batch 2025)', 'Kavitha S (Batch 2025)'],
    looking_for_teammates: true,
    required_skills: ['PCB Design', 'Embedded C', 'Thermal Modeling'],
    pass_it_forward: true,
    continuation_notes: 'Original hardware architecture established by Class of 2024. Open for 3rd and 2nd year juniors to build the cloud dashboard and hardware-in-the-loop tests.',
    stars: 28,
    status: 'active',
    created_at: '2026-09-15T10:00:00.000Z',
  },
  {
    id: 'proj-002',
    user_id: 'fdd67c3e-707f-46be-bd3a-450e9c36a678', // Ananya Pillai (TI Alumni)
    title: 'Low-Power 32-bit RISC-V Core with Custom DSP MAC Unit in Verilog',
    domain: 'VLSI & Chip Design',
    description: 'Fully synthesizable 5-stage pipelined RV32IM RISC-V core designed in Verilog HDL. Includes a dedicated single-cycle multiply-accumulate (MAC) accelerator for real-time audio filtering. Validated on Xilinx Artix-7 FPGA.',
    hardware_specs: 'Verilog HDL, Xilinx Vivado, Cadence Genus Synthesis, Artix-7 100T FPGA, 65nm TSMC PDK',
    github_url: 'https://github.com/ritece/riscv-rv32im-dsp',
    demo_url: '',
    team_members: ['Ananya Pillai (Alumni TI)', 'Siddharth M (Batch 2024)'],
    looking_for_teammates: true,
    required_skills: ['Verilog', 'SystemVerilog', 'UVM Verification', 'FPGA Prototyping'],
    pass_it_forward: true,
    continuation_notes: 'Passed forward by TI alumni team. Juniors can continue implementing branch prediction and floating-point co-processor.',
    stars: 45,
    status: 'active',
    created_at: '2026-08-20T14:30:00.000Z',
  },
  {
    id: 'proj-003',
    user_id: 'fafd14d1-aa42-45a7-aae7-4713d9d7e87c', // Rajesh Iyer
    title: 'Autonomous Agricultural Weed Detection Rover using ROS2 & TinyML',
    domain: 'Robotics & Automation',
    description: 'Autonomous four-wheel drive field rover that traverses crop rows and identifies invasive weeds using an onboard Raspberry Pi 5 with Coral Edge TPU. Controls a precision micro-sprayer mechanism to minimize chemical usage.',
    hardware_specs: 'Raspberry Pi 5, Coral Edge TPU, BLDC Hub Motors, RTK-GPS Module, ROS2 Humble',
    github_url: 'https://github.com/ritece/agri-rover-ros2',
    demo_url: 'https://youtu.be/rit-agri-rover',
    team_members: ['Rajesh Iyer (Batch 2024)', 'Pooja R (Batch 2025)'],
    looking_for_teammates: true,
    required_skills: ['ROS2', 'Computer Vision', 'Motor Drivers', '3D CAD Design'],
    pass_it_forward: false,
    continuation_notes: 'Currently recruiting 1 mechanical/circuit designer and 1 firmware programmer for Smart India Hackathon participation.',
    stars: 34,
    status: 'active',
    created_at: '2026-09-01T09:15:00.000Z',
  },
  {
    id: 'proj-004',
    user_id: '1808a854-7d43-4f36-8d56-641e3393416f',
    title: '5G Massive MIMO Beamforming Antenna Array & RF Front-End Design',
    domain: 'Telecom & Core ECE',
    description: 'Design and simulation of a 28 GHz microstrip patch antenna array with digital phase shifters for 5G millimeter-wave mobile communications. Achieved 14 dBi peak gain and steerable beam angle over 120 degrees in CST Studio.',
    hardware_specs: 'CST Studio Suite, Keysight ADS, Rogers RO4350B Substrate, Spectrum Analyzer',
    github_url: 'https://github.com/ritece/5g-mimo-array',
    demo_url: '',
    team_members: ['Faculty Advisor: Dr. R. Sundar', 'Vikram N (Batch 2024)'],
    looking_for_teammates: true,
    required_skills: ['RF Engineering', 'CST Microwave Studio', 'Antenna Theory', 'Smith Charts'],
    pass_it_forward: true,
    continuation_notes: 'Seeking 3rd-year students interested in hardware fabrication and IEEE conference paper submission.',
    stars: 22,
    status: 'active',
    created_at: '2026-07-10T11:00:00.000Z',
  },
  {
    id: 'proj-005',
    user_id: '1808a854-7d43-4f36-8d56-641e3393416f',
    title: 'Ultra-low Power ECG Arrhythmia Detector with On-Device Spiking NN',
    domain: 'AI & Edge Computing',
    description: 'Wearable cardiac patch utilizing bio-potential front-end (ADS1292R) and Spiking Neural Network on Nordic nRF5340 dual-core BLE SoC. Classifies 5 classes of cardiac arrhythmia with under 1.2 mW average power draw.',
    hardware_specs: 'nRF5340 Dual-Core BLE, ADS1292R Analog Front-End, Edge Impulse, FreeRTOS',
    github_url: 'https://github.com/ritece/ecg-tinyml-patch',
    demo_url: '',
    team_members: ['Sneha Raman (Batch 2025)'],
    looking_for_teammates: true,
    required_skills: ['Biomedical Signals', 'nRF Connect SDK', 'BLE GATT Services', 'Signal Filtering'],
    pass_it_forward: false,
    continuation_notes: 'Looking for 1 co-developer to assist with Bluetooth mobile companion app.',
    stars: 19,
    status: 'active',
    created_at: '2026-09-25T16:20:00.000Z',
  },
];

// Get all ECE projects (with domain, skill, teammates, continuation filters)
router.get('/', (req, res) => {
  try {
    const { domain, search: q, looking_for_teammates, pass_it_forward } = req.query;
    let projects = findAll('projects');

    if (domain && domain !== 'all') {
      projects = projects.filter(p => (p.domain || '').toLowerCase() === domain.toLowerCase());
    }
    if (looking_for_teammates === 'true') {
      projects = projects.filter(p => p.looking_for_teammates === true);
    }
    if (pass_it_forward === 'true') {
      projects = projects.filter(p => p.pass_it_forward === true);
    }
    if (q) {
      const lower = q.toLowerCase();
      projects = projects.filter(p =>
        (p.title || '').toLowerCase().includes(lower) ||
        (p.description || '').toLowerCase().includes(lower) ||
        (p.hardware_specs || '').toLowerCase().includes(lower) ||
        (p.required_skills || []).some(s => s.toLowerCase().includes(lower))
      );
    }

    // Attach creator details
    const enriched = projects.map(p => {
      const creator = findById('users', p.user_id);
      return {
        ...p,
        creator: creator ? {
          id: creator.id,
          full_name: creator.full_name,
          profile_photo: creator.profile_photo || creator.avatar || '',
          headline: creator.headline,
          account_type: creator.account_type,
          batch: creator.batch,
        } : null,
      };
    }).sort((a, b) => (b.stars || 0) - (a.stars || 0));

    res.json({ projects: enriched, data: enriched, success: true });
  } catch (err) {
    console.error('Projects error:', err);
    res.status(500).json({ error: 'Server error loading projects' });
  }
});

// Create new ECE Project
router.post('/', (req, res) => {
  try {
    const { title, domain, description, hardware_specs, github_url, demo_url, required_skills, looking_for_teammates, pass_it_forward, continuation_notes } = req.body;
    if (!title || !domain || !description) {
      return res.status(400).json({ error: 'Title, domain, and description are mandatory' });
    }

    const user = findById('users', req.user.id);
    const newProject = {
      id: uuidv4(),
      user_id: req.user.id,
      title,
      domain,
      description,
      hardware_specs: hardware_specs || '',
      github_url: github_url || '',
      demo_url: demo_url || '',
      team_members: [`${user?.full_name || 'Creator'} (${user?.batch || 'ECE'})`],
      looking_for_teammates: !!looking_for_teammates,
      required_skills: Array.isArray(required_skills) ? required_skills : (required_skills ? required_skills.split(',').map(s => s.trim()).filter(Boolean) : []),
      pass_it_forward: !!pass_it_forward,
      continuation_notes: continuation_notes || '',
      stars: 1,
      status: 'active',
      created_at: new Date().toISOString(),
    };

    insert('projects', newProject);
    res.status(201).json({ project: newProject, data: newProject, success: true });
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Server error creating project' });
  }
});

// Star/Upvote project
router.post('/:id/star', (req, res) => {
  try {
    const project = findById('projects', req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const newStars = (project.stars || 0) + 1;
    update('projects', req.params.id, { stars: newStars });
    res.json({ success: true, stars: newStars });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Apply to join project team / Request continuation files
router.post('/:id/join', (req, res) => {
  try {
    const { message, skills } = req.body;
    const project = findById('projects', req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const applicant = findById('users', req.user.id);
    if (project.user_id && project.user_id !== req.user.id) {
      insert('notifications', {
        id: uuidv4(),
        user_id: project.user_id,
        from_user_id: req.user.id,
        type: 'project_application',
        title: `Teammate Application: ${project.title}`,
        message: `${applicant?.full_name || 'A student'} applied to join "${project.title}": "${message || 'I would like to collaborate on this project'}"`,
        link: `/profile/${req.user.id}`,
        is_read: 0,
        created_at: new Date().toISOString(),
      });
    }

    res.json({ success: true, message: 'Application submitted! The project lead has been notified.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error applying to project' });
  }
});

export default router;

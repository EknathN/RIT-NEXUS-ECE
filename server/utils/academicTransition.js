import { findAll, update, insert } from '../db/schema.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * RIT ECE Academic Progression & Time-Lapse Rollover Engine
 * 
 * Rules:
 * - 4th Years graduate and automatically transition to Alumni (role: alumni, account_type: alumni)
 * - 3rd Years are automatically promoted to 4th Year (Final Year)
 * - 2nd Years are automatically promoted to 3rd Year
 */
export function performAcademicRollover({ dryRun = false } = {}) {
  const users = findAll('users').filter(u => u.role !== 'admin');
  const students = users.filter(u => u.account_type === 'student');

  const summary = {
    graduatedToAlumni: [],
    promotedTo4thYear: [],
    promotedTo3rdYear: [],
    unchanged: [],
    timestamp: new Date().toISOString(),
  };

  for (const student of students) {
    const sId = student.id;
    const currentYear = student.year ? String(student.year).trim() : '';

    if (currentYear === '4') {
      const gradYear = student.graduation_year || (student.batch ? student.batch.split('-')[1]?.trim() : '2027') || '2027';
      const updatedData = {
        account_type: 'alumni',
        role: 'alumni',
        year: '',
        graduation_year: String(gradYear),
        headline: student.headline && student.headline.includes('Year')
          ? student.headline.replace(/4th Year|Final Year/gi, `Alumni (Class of ${gradYear})`)
          : student.headline || `RIT ECE Alumni • Class of ${gradYear}`,
        updated_at: new Date().toISOString(),
      };

      summary.graduatedToAlumni.push({
        id: sId,
        name: student.full_name,
        email: student.email,
        fromYear: '4th Year',
        toStatus: 'Alumni',
        graduationYear: gradYear,
      });

      if (!dryRun) {
        update('users', sId, updatedData);
        // Create congratulatory graduation notification
        try {
          insert('notifications', {
            id: uuidv4(),
            user_id: sId,
            type: 'academic_milestone',
            title: '🎓 Congratulations on Graduating!',
            content: `You have successfully completed your B.E. in Electronics & Communication Engineering. Your profile has transitioned to RIT ECE Alumni.`,
            link: `/profile/${sId}`,
            is_read: 0,
            created_at: new Date().toISOString(),
          });
        } catch (e) {}
      }
    } else if (currentYear === '3') {
      const updatedData = {
        year: '4',
        headline: student.headline && student.headline.includes('3rd Year')
          ? student.headline.replace(/3rd Year/gi, '4th Year (Final Year)')
          : student.headline || 'ECE 4th Year Student • RIT Chennai',
        updated_at: new Date().toISOString(),
      };

      summary.promotedTo4thYear.push({
        id: sId,
        name: student.full_name,
        email: student.email,
        fromYear: '3rd Year',
        toYear: '4th Year',
      });

      if (!dryRun) {
        update('users', sId, updatedData);
        try {
          insert('notifications', {
            id: uuidv4(),
            user_id: sId,
            type: 'academic_promotion',
            title: '🎉 Promoted to 4th Year!',
            content: `Welcome to your Final Year in RIT ECE. Explore campus placements, final year capstone projects, and mentorship.`,
            link: `/home`,
            is_read: 0,
            created_at: new Date().toISOString(),
          });
        } catch (e) {}
      }
    } else if (currentYear === '2') {
      const updatedData = {
        year: '3',
        headline: student.headline && student.headline.includes('2nd Year')
          ? student.headline.replace(/2nd Year/gi, '3rd Year')
          : student.headline || 'ECE 3rd Year Student • RIT Chennai',
        updated_at: new Date().toISOString(),
      };

      summary.promotedTo3rdYear.push({
        id: sId,
        name: student.full_name,
        email: student.email,
        fromYear: '2nd Year',
        toYear: '3rd Year',
      });

      if (!dryRun) {
        update('users', sId, updatedData);
        try {
          insert('notifications', {
            id: uuidv4(),
            user_id: sId,
            type: 'academic_promotion',
            title: '🎉 Promoted to 3rd Year!',
            content: `You are now in 3rd Year. Check out pre-final year internship drives and project bank opportunities.`,
            link: `/home`,
            is_read: 0,
            created_at: new Date().toISOString(),
          });
        } catch (e) {}
      }
    } else {
      summary.unchanged.push({
        id: sId,
        name: student.full_name,
        reason: 'No standard year assigned',
      });
    }
  }

  return summary;
}

/**
 * Automatic background check based on graduation year.
 * If a 4th year student's graduation year has passed, transition them to alumni.
 */
export function autoCheckGraduationStatus() {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12

    // Indian engineering academic years typically conclude around May/June.
    // If it's July or later in the graduation year, graduate automatically.
    const users = findAll('users').filter(u => u.account_type === 'student');
    for (const student of users) {
      const gradYear = parseInt(student.graduation_year || 0, 10);
      if (gradYear && (currentYear > gradYear || (currentYear === gradYear && currentMonth >= 6))) {
        if (student.year === '4' || student.account_type === 'student') {
          update('users', student.id, {
            account_type: 'alumni',
            role: 'alumni',
            year: '',
            graduation_year: String(gradYear),
            updated_at: new Date().toISOString(),
          });
        }
      }
    }
  } catch (err) {
    console.error('autoCheckGraduationStatus error:', err);
  }
}

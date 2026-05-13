import { useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../contexts/NotificationContext';
import { Booking } from '../types';

export function TechnicianNotificationListener() {
  const { user } = useAuth();
  const { notify } = useNotify();
  const [prevJobs, setPrevJobs] = useState<Record<string, { status: Booking['status'], techId: string | undefined }>>({});
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (!user || user.role !== 'technician') return;

    // We listen for jobs that are either unassigned and approved OR assigned to this technician
    const q = query(
      collection(db, 'bookings'),
      where('status', 'in', ['approved', 'dispatched', 'on_the_way', 'arriving', 'arrived', 'process_started', 'repair_started', 'repair_completed', 'payment_received', 'cancelled'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const currentJobsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      
      // Filter for jobs relevant to this technician
      const relevantJobs = currentJobsData.filter(j => 
        j.technicianId === user.id || (!j.technicianId && j.status === 'approved')
      );

      const nextPrev: Record<string, { status: Booking['status'], techId: string | undefined }> = {};
      
      relevantJobs.forEach(job => {
        nextPrev[job.id] = { status: job.status, techId: job.technicianId };
        
        // If it's not the initial load, check for changes
        if (!isInitialMount.current) {
          const oldData = prevJobs[job.id];
          
          if (oldData === undefined) {
            // New job appeared in our relevant set
            if (job.status === 'approved' && !job.technicianId) {
              notify('New Job Available', `A new request for "${job.problem}" is waiting for assignment.`, 'info');
            } else if (job.technicianId === user.id) {
               notify('New Job Assigned', `You have been assigned to "${job.problem}".`, 'success');
            }
          } else {
            // Check for assignment change
            if (oldData.techId !== job.technicianId && job.technicianId === user.id) {
               notify('New Job Assigned', `You have been assigned to "${job.problem}".`, 'success');
            }
            
            // Status changed
            if (oldData.status !== job.status) {
              if (job.status === 'cancelled') {
                notify('Job Cancelled', `Job #${job.id.slice(-6).toUpperCase()} has been cancelled by the customer.`, 'warning');
              }
            }
          }
        }
      });

      setPrevJobs(nextPrev);
      isInitialMount.current = false;
    });

    return () => unsubscribe();
  }, [user, notify, prevJobs]);

  return null; // This component doesn't render anything
}

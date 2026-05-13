import { useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../contexts/NotificationContext';
import { Booking } from '../types';

export function CustomerNotificationListener() {
  const { user } = useAuth();
  const { notify } = useNotify();
  const [prevJobs, setPrevJobs] = useState<Record<string, { status: Booking['status'], techId: string | undefined }>>({});
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (!user || user.role !== 'customer') return;

    // Listen only for this customer's bookings
    const q = query(
      collection(db, 'bookings'),
      where('customerId', '==', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const currentJobsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      
      const nextPrev: Record<string, { status: Booking['status'], techId: string | undefined }> = {};
      
      currentJobsData.forEach(job => {
        nextPrev[job.id] = { status: job.status, techId: job.technicianId };
        
        if (!isInitialMount.current) {
          const oldData = prevJobs[job.id];
          
          if (oldData) {
            // Check for technician assignment
            if (!oldData.techId && job.technicianId) {
              notify('Technician Assigned', `A technician has been assigned to your booking "${job.problem}".`, 'success');
            }
            
            // Status updates
            if (oldData.status !== job.status) {
              switch (job.status) {
                case 'dispatched':
                  notify('Job Started', 'Your service request has been processed and a technician will move soon.', 'info');
                  break;
                case 'on_the_way':
                  notify('Technician on the Way', 'The technician is heading to your location. You can track them on the map.', 'info');
                  break;
                case 'arriving':
                  notify('Arriving Soon', 'The technician is almost at your location.', 'info');
                  break;
                case 'arrived':
                  notify('Technician Arrived', 'The technician has arrived at your address.', 'success');
                  break;
                case 'repair_completed':
                  notify('Repair Completed', 'The technician has finished the repair. Please proceed with payment.', 'success');
                  break;
                case 'completed':
                  notify('Service Completed', 'Thank you for choosing our service!', 'success');
                  break;
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

  return null;
}

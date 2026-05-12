import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Booking } from '../../types';
import { Map as MapIcon, Navigation } from 'lucide-react';

const NANJANGUD_CENTER: [number, number] = [12.1186, 76.6800];

const jobIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function TechMap() {
  const [jobs, setJobs] = useState<Booking[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'bookings'),
      where('status', 'in', ['approved', 'on_the_way'])
    );
    return onSnapshot(q, (snapshot) => {
      setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
    });
  }, []);

  return (
    <div className="h-full flex flex-col">
      <header className="p-6 bg-white border-b">
        <h1 className="text-xl font-bold flex items-center gap-2">
           <MapIcon className="text-blue-600" /> Active Jobs Map
        </h1>
      </header>

      <div className="flex-1 z-0">
        <MapContainer 
          center={NANJANGUD_CENTER} 
          zoom={14} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {jobs.map((job) => job.location && (
            <Marker key={job.id} position={[job.location.lat, job.location.lng]} icon={jobIcon}>
              <Popup>
                <div className="p-1">
                   <h3 className="font-bold text-sm mb-1">{job.problem}</h3>
                   <p className="text-[10px] text-gray-500 mb-2">{job.address}</p>
                   <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase">
                      <Navigation size={10} /> {job.status}
                   </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

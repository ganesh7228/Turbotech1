export type UserRole = 'customer' | 'admin' | 'technician';

export interface User {
  id: string;
  phone: string;
  name?: string;
  role: UserRole;
  createdAt: string;
}

export type BookingStatus = 
  | 'pending' 
  | 'pending_callback' 
  | 'approved' 
  | 'on_the_way' 
  | 'dispatched'
  | 'arriving' 
  | 'arrived' 
  | 'process_started' 
  | 'repair_started' 
  | 'repair_completed' 
  | 'payment_received' 
  | 'completed' 
  | 'rejected' 
  | 'cancelled';
export type RewardStatus = 'pending' | 'approved' | 'rejected';
export type BookingType = 'normal' | 'quick';

export interface Booking {
  appliedOffer?: string | null;
  isFirstOrder?: boolean;
  rewardStatus?: RewardStatus;
  rewardRejectedReason?: string;
  rewardRejectedAt?: string;
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  address: string;
  problem: string;
  date?: string;
  timeSlot?: string;
  type: BookingType;
  status: BookingStatus;
  technicianId?: string;
  techLocation?: {
    lat: number;
    lng: number;
  };
  techLocationShareEnabled?: boolean;
  location?: {
    lat: number;
    lng: number;
  };
  statusHistory?: {
    status: BookingStatus;
    timestamp: string;
  }[];
  eta?: string;
  distance?: number;
  total?: number;
  serviceCharge?: number;
  partsCost?: number;
  housePhoto?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  createdAt: string;
}

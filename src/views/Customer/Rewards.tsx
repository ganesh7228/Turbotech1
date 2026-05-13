import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../lib/firebase';
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { Reward } from '../../types';
import { Gift, ChevronLeft, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';

type GiftStatus = 'Gift' | 'Gift dispatched' | 'Gift out for delivery' | 'Gift delivered';

export default function RewardsView() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  const [points, setPoints] = useState<number>(0);
  const [redeemedRewardIds, setRedeemedRewardIds] = useState<string[]>([]);
  const [claimLoadingId, setClaimLoadingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const eligibleRewardIds = useMemo(() => {
    const redeemedSet = new Set(redeemedRewardIds);
    return rewards
      .filter((r) => !redeemedSet.has(r.id))
      .filter((r) => {
        const required = r.pointsRequired ?? 0;
        return points >= required;
      })
      .map((r) => r.id);
  }, [points, redeemedRewardIds, rewards]);

  useEffect(() => {
    const q = query(collection(db, 'rewards'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setRewards(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Reward)));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const syncUserPoints = async () => {
      if (!user?.id) return;

      const userRef = doc(db, 'users', user.id);
      const snap = await getDoc(userRef);
      const data = snap.exists() ? snap.data() : undefined;

      const nextPoints =
        typeof data?.points === 'number' && Number.isFinite(data.points) ? data.points : 0;

      const nextRedeemed = Array.isArray(data?.redeemedRewardIds)
        ? (data?.redeemedRewardIds as string[])
        : [];

      setPoints(nextPoints);
      setRedeemedRewardIds(nextRedeemed);
    };

    syncUserPoints().catch((e) => console.error(e));
  }, [user?.id]);

  const handleClaim = async (rewardId: string) => {
    if (!user?.id) return;

    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward) return;

    const required = reward.pointsRequired ?? 0;

    if (points < required) return;
    if (redeemedRewardIds.includes(rewardId)) return;

    setClaimError(null);
    setClaimLoadingId(rewardId);

    try {
      const userRef = doc(db, 'users', user.id);

      // Refresh user data to reduce race conditions
      const freshSnap = await getDoc(userRef);
      const data = freshSnap.exists() ? freshSnap.data() : undefined;

      const freshPoints =
        typeof data?.points === 'number' && Number.isFinite(data.points) ? data.points : 0;

      const freshRedeemed = Array.isArray(data?.redeemedRewardIds)
        ? (data?.redeemedRewardIds as string[])
        : [];

      if (freshRedeemed.includes(rewardId)) {
        setClaimError('Already redeemed.');
        return;
      }
      if (freshPoints < required) {
        setClaimError('Not enough points.');
        return;
      }

      const nextPoints = freshPoints - required;

      // 1) Deduct points + mark reward redeemed
      await updateDoc(userRef, {
        points: nextPoints,
        redeemedRewardIds: arrayUnion(rewardId),
      });

      // 2) Create a new “free gift order” booking pending admin approval
      //    We reuse the existing booking flow by setting:
      //    - status: pending_callback (admin will move it to approved)
      //    - giftStatus: "Gift" (pending admin)
      //    The normal technician flow will pick up once admin sets status to approved.
      const bookingData = {
        customerId: user.id,
        customerName: user.name || user.phone,
        phone: user.phone,

        // Fill required booking fields with safe defaults; technician UI primarily needs
        // address/problem/status/phone/customerName plus status progression.
        address: 'Free gift delivery',
        problem: reward.title || 'Free Gift',
        date: null,
        timeSlot: 'ASAP',
        type: 'quick',

        // Start gift approval flow
        status: 'pending_callback',
        statusHistory: [
          { status: 'pending_callback', timestamp: new Date().toISOString() },
        ],

        // Gift lifecycle
        giftStatus: 'Gift' as GiftStatus,

        // existing reward rejection UI uses these fields; we keep them empty for now
        rewardStatus: 'pending',
        rewardRejectedReason: null,
        rewardRejectedAt: null,

        // monetary fields are irrelevant for gifts
        serviceCharge: 0,
        partsCost: 0,
        total: 0,

        appliedOffer: reward.title || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'bookings'), bookingData);

      // Optimistic UI sync
      setPoints(nextPoints);
      setRedeemedRewardIds([...freshRedeemed, rewardId]);
    } catch (e: any) {
      console.error(e);
      setClaimError(e?.message ? String(e.message) : 'Failed to claim reward.');
    } finally {
      setClaimLoadingId(null);
    }
  };

  return (
    <div className="p-6 pb-28 bg-[#F8F9FB] min-h-screen max-w-xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-8 h-8 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center transition-all active:bg-gray-50"
          >
            <ChevronLeft size={16} className="text-gray-900" />
          </motion.button>
          <h1 className="text-xl font-black text-gray-900 tracking-tight font-display">Rewards</h1>
        </div>
        <div className="w-8 h-8 bg-[#2F70E9]/10 rounded-xl flex items-center justify-center text-[#2F70E9]">
          <Gift size={16} strokeWidth={2.5} />
        </div>
      </header>

      {/* Points Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#2F70E9] p-6 rounded-[32px] mb-8 relative overflow-hidden shadow-xl shadow-blue-200/40"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <p className="text-white/70 text-[9px] font-black uppercase tracking-[2px] mb-1.5 font-mono">
            My Balance
          </p>
          <h2 className="text-4xl font-black text-white font-display mb-0.5 flex items-baseline gap-1.5">
            {points} <span className="text-[14px] text-white/50">PTS</span>
          </h2>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full mt-3 border border-white/10">
            <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
            <span className="text-[8px] font-black text-white uppercase tracking-widest leading-none">
              Rewards Ready
            </span>
          </div>
        </div>
      </motion.div>

      {claimError && (
        <div className="mb-4 bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-2xl text-[10px] font-bold uppercase tracking-tight">
          {claimError}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-[24px] p-4 border border-gray-50 animate-pulse"
            >
              <div className="aspect-square bg-gray-50 rounded-xl mb-3" />
              <div className="h-3 bg-gray-50 rounded-full w-3/4 mb-2" />
              <div className="h-2 bg-gray-50 rounded-full w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {rewards.map((reward) => {
            const required = reward.pointsRequired ?? 0;
            const isRedeemed = redeemedRewardIds.includes(reward.id);
            const isEligible = eligibleRewardIds.includes(reward.id);
            const isLoading = claimLoadingId === reward.id;

            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={reward.id}
                className="bg-white rounded-[28px] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.02)] border border-gray-50 flex flex-col group relative overflow-hidden"
              >
                <div className="aspect-square rounded-[20px] bg-[#F8F9FB] mb-3 overflow-hidden flex items-center justify-center relative border border-gray-50">
                  {reward.imageUrl ? (
                    <img
                      src={reward.imageUrl}
                      alt={reward.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <ImageIcon size={24} className="text-gray-200" />
                  )}
                </div>

                <h3 className="font-black text-gray-900 text-[13px] mb-1 font-display line-clamp-1">
                  {reward.title}
                </h3>

                <p className="text-[9px] font-bold text-gray-400 line-clamp-2 leading-tight uppercase tracking-tight">
                  {reward.description}
                </p>

                <div className="mt-2 inline-flex items-center gap-2 px-2 py-0.5 rounded-xl bg-amber-50 border border-amber-100">
                  <span className="text-[10px] font-bold text-amber-800">Requires</span>
                  <span className="text-[10px] font-black text-amber-900">{required} PTS</span>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between items-center gap-2">
                  {isRedeemed ? (
                    <span className="text-[8px] font-black text-green-700 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded-lg">
                      Redeemed
                    </span>
                  ) : isEligible ? (
                    <button
                      type="button"
                      onClick={() => handleClaim(reward.id)}
                      disabled={isLoading}
                      className="text-[8px] font-black text-[#2F70E9] uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 hover:bg-blue-100 disabled:opacity-50 transition-all"
                    >
                      {isLoading ? '...' : 'CLAIM'}
                    </button>
                  ) : (
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded-lg">
                      Not enough
                    </span>
                  )}

                  <div className="w-6 h-6 bg-[#F8F9FB] rounded-full flex items-center justify-center text-gray-200 border border-gray-50">
                    <Gift size={12} />
                  </div>
                </div>
              </motion.div>
            );
          })}

          {rewards.length === 0 && (
            <div className="col-span-2 py-24 text-center bg-white border border-gray-100 rounded-[48px] shadow-sm">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-200">
                <Gift size={40} />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2 font-display">No rewards yet</h3>
              <p className="text-xs font-bold text-gray-400 max-w-[200px] mx-auto leading-relaxed">
                Keep booking services to earn exclusive rewards and coupons.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

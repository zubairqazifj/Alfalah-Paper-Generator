import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        const profileRef = doc(db, 'teachers', firebaseUser.uid);
        
        unsubscribeProfile = onSnapshot(profileRef, async (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as UserProfile;
            const isMasterAdmin = firebaseUser.email === 'mzubairmit@gmail.com';
            
            // Force admin role and unlimited quota for the master email
            if (isMasterAdmin && (data.role !== 'admin' || data.paperQuota < 900000)) {
              const updatedProfile = { 
                ...data, 
                role: 'admin' as const,
                paperQuota: 999999 
              };
              await setDoc(profileRef, updatedProfile, { merge: true });
              setProfile(updatedProfile);
            } else {
              setProfile(data);
            }
            setLoading(false);
          } else {
            console.log('Profile does not exist, creating for:', firebaseUser.uid);
            // If profile doesn't exist, create it
            const name = firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Teacher');
            
            const isMasterAdmin = firebaseUser.email === 'mzubairmit@gmail.com';
            
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              name: name,
              email: firebaseUser.email || '',
              role: isMasterAdmin ? 'admin' : 'teacher',
              status: 'active',
              paperQuota: isMasterAdmin ? 999999 : 5,
              quotaUsed: 0,
              createdAt: new Date().toISOString(),
            };
            
            try {
              await setDoc(profileRef, newProfile);
              console.log('Profile created successfully');
              setProfile(newProfile);
            } catch (err) {
              console.error('Failed to create profile:', err);
            }
            setLoading(false);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `teachers/${firebaseUser.uid}`);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isAdmin: profile?.role === 'admin' || user?.email === 'mzubairmit@gmail.com' 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { UserRole, Permission, AuthUser, UserActivity } from '../types';
import { getPermissionsForRole, hasPermission as checkPermission } from '../constants';
import { getFirebaseAuth } from '../../firebase/auth';
import { readUserRecord, readParticipantRecord, signOut } from '../../services/authService';

interface RBACContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isFirstLogin: boolean;
  isLoading: boolean;
  role: UserRole | null;
  permissions: Permission[];
  login: (user: AuthUser) => void;
  logout: () => void;
  setFirstLogin: (val: boolean) => void;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  canAccessModule: (moduleName: string) => boolean;
  isRole: (role: UserRole) => boolean;
  isAtLeast: (role: UserRole) => boolean;
  userActivities: UserActivity[];
  addActivity: (action: string, details: string) => void;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

const STORAGE_KEYS = {
  user: 'casyum_rbac_user',
  activities: 'casyum_user_activities',
};

export const RBACProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.user);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [userActivities, setUserActivities] = useState<UserActivity[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.activities);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.user);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.activities, JSON.stringify(userActivities));
  }, [userActivities]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setIsFirstLogin(false);
        setIsLoading(false);
        return;
      }
      const uid = firebaseUser.uid;
      try {
        const staff = await readUserRecord(uid);
        if (staff) {
          setUser({
            id: uid,
            name: staff.full_name,
            email: staff.email,
            role: staff.role as UserRole,
            token: await firebaseUser.getIdToken(),
            department: staff.department,
            phone: staff.phone,
            is_first_login: staff.is_first_login === true,
          });
          setIsFirstLogin(staff.is_first_login === true);
        } else {
          const participant = await readParticipantRecord(uid);
          if (participant) {
            setUser({
              id: uid,
              name: participant.full_name,
              email: participant.email || '',
              role: 'Participant',
              token: await firebaseUser.getIdToken(),
              phone: participant.phone,
              department: participant.department,
              is_first_login: false,
            });
          } else {
            setUser(null);
          }
        }
      } catch {
        // Keep the cached user if a transient network error occurs.
      } finally {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const role = user?.role ?? null;
  const permissions = useMemo(() => (role ? getPermissionsForRole(role) : []), [role]);

  const login = useCallback((authUser: AuthUser) => {
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsFirstLogin(false);
    localStorage.removeItem(STORAGE_KEYS.user);
    void signOut();
  }, []);

  const setFirstLogin = useCallback((val: boolean) => {
    setIsFirstLogin(val);
  }, []);

  const hasPermission = useCallback(
    (permission: Permission) => role ? checkPermission(role, permission) : false,
    [role]
  );

  const hasAnyPermission = useCallback(
    (perms: Permission[]) => perms.some((p) => hasPermission(p)),
    [hasPermission]
  );

  const hasAllPermissions = useCallback(
    (perms: Permission[]) => perms.every((p) => hasPermission(p)),
    [hasPermission]
  );

  const canAccessModule = useCallback(
    (moduleName: string) => {
      const domain = moduleName.toLowerCase().replace(/\s+/g, '_') as any;
      const perm = `${domain}.view` as Permission;
      return hasPermission(perm);
    },
    [hasPermission]
  );

  const isRole = useCallback((r: UserRole) => role === r, [role]);

  const roleHierarchy: Record<UserRole, number> = {
    'Super Admin': 0,
    'Admin': 1,
    'Event Coordinator': 2,
    'Coordinator': 2,
    'Event Coordinator (Student)': 2,
    'Event Coordinator (Faculty)': 2,
    'Registration Manager': 3,
    'Registration Team': 3,
    'Certificate Manager': 4,
    'Finance Manager': 5,
    'Participant': 6,
    'casyum_faculty_coordinator': 2,
  };

  const isAtLeast = useCallback(
    (targetRole: UserRole) => {
      if (!role) return false;
      return (roleHierarchy[role] ?? 99) <= (roleHierarchy[targetRole] ?? 99);
    },
    [role]
  );

  const addActivity = useCallback((action: string, details: string) => {
    if (!user) return;
    const activity: UserActivity = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      details,
      timestamp: new Date().toLocaleString(),
    };
    setUserActivities((prev) => [activity, ...prev]);
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isFirstLogin,
      isLoading,
      role,
      permissions,
      login,
      logout,
      setFirstLogin,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      canAccessModule,
      isRole,
      isAtLeast,
      userActivities,
      addActivity,
    }),
    [user, isFirstLogin, isLoading, role, permissions, login, logout, setFirstLogin, hasPermission, hasAnyPermission, hasAllPermissions, canAccessModule, isRole, isAtLeast, userActivities, addActivity]
  );

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
};

export const useRBAC = () => {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
};

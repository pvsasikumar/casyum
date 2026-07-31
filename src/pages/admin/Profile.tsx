import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Shield,
  Phone,
  Building2,
  Clock,
  BadgeCheck,
  Camera,
  Save,
  X,
  ArrowLeft,
  Pencil,
} from 'lucide-react';
import { useAdmin } from '../../admin/context/AdminContext';
import { uploadImageToStorage } from '../../firebase/storage';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { adminProfile, updateAdminProfile, addToast } = useAdmin();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: adminProfile.name,
    phone: adminProfile.phone,
  });
  const [photoPreview, setPhotoPreview] = useState(adminProfile.photo);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const url = await uploadImageToStorage('profiles', file);
      setPhotoPreview(url);
    } catch {
      addToast('Upload Failed', 'Could not upload the profile photo.', 'error');
    } finally {
      setPhotoUploading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: { name?: string; phone?: string } = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s-]{10,15}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Enter a valid phone number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    updateAdminProfile({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      photo: photoPreview || adminProfile.photo,
    });
    setIsEditing(false);
    addToast('Profile Updated', 'Your profile has been updated successfully.', 'success');
  };

  const handleCancel = () => {
    setFormData({ name: adminProfile.name, phone: adminProfile.phone });
    setPhotoPreview(adminProfile.photo);
    setErrors({});
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin')}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
            Admin Profile
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
            My Profile
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Photo Card */}
        <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-violet-500 to-cyan-400 p-[2px]">
              <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-violet-300" />
                )}
              </div>
            </div>
            {isEditing && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploading}
                className="absolute bottom-1 right-1 p-2 rounded-full bg-violet-600 hover:bg-violet-700 text-white border-2 border-zinc-900 shadow-lg transition-all cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            )}
            {photoUploading && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] text-violet-300 font-bold bg-zinc-900/70 rounded-full">
                Uploading...
              </span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
          <div className="text-center">
            <span className="text-sm font-bold text-white">{adminProfile.name}</span>
            <span className="text-[11px] text-white/50 block">{adminProfile.role}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <BadgeCheck className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400">{adminProfile.accountStatus}</span>
          </div>
        </div>

        {/* Details Card */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Profile Information</h3>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-xs font-bold transition-all cursor-pointer"
              >
                <Pencil className="w-3 h-3" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProfileField
              icon={<User className="w-4 h-4 text-violet-400" />}
              label="Full Name"
              value={formData.name}
              editable={isEditing}
              error={errors.name}
              onChange={(v) => setFormData((p) => ({ ...p, name: v }))}
            />
            <ProfileField
              icon={<Mail className="w-4 h-4 text-cyan-400" />}
              label="Email"
              value={adminProfile.email}
              editable={false}
            />
            <ProfileField
              icon={<Shield className="w-4 h-4 text-amber-400" />}
              label="Role"
              value={adminProfile.role}
              editable={false}
            />
            <ProfileField
              icon={<Phone className="w-4 h-4 text-emerald-400" />}
              label="Phone Number"
              value={formData.phone}
              editable={isEditing}
              error={errors.phone}
              onChange={(v) => setFormData((p) => ({ ...p, phone: v }))}
            />
            <ProfileField
              icon={<Building2 className="w-4 h-4 text-pink-400" />}
              label="Department"
              value={adminProfile.department}
              editable={false}
            />
            <ProfileField
              icon={<Clock className="w-4 h-4 text-sky-400" />}
              label="Last Login"
              value={adminProfile.lastLogin}
              editable={false}
            />
          </div>

          {isEditing && (
            <div className="flex items-center gap-3 pt-2 border-t border-white/10 mt-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-lg shadow-violet-500/25 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ProfileFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  editable?: boolean;
  error?: string;
  onChange?: (value: string) => void;
}

const ProfileField: React.FC<ProfileFieldProps> = ({ icon, label, value, editable, error, onChange }) => {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
        {icon}
        <span>{label}</span>
      </label>
      {editable ? (
        <div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className={`w-full p-2.5 rounded-xl bg-white/5 border text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all ${
              error ? 'border-rose-500/50' : 'border-white/10'
            }`}
          />
          {error && <span className="text-[10px] text-rose-400 mt-1">{error}</span>}
        </div>
      ) : (
        <span className="text-sm text-white/80">{value}</span>
      )}
    </div>
  );
};

import { createContext, useContext, useState, ReactNode } from 'react';

interface UserProfileModalContextType {
  selectedUserProfileId: string;
  onOpen: (userId: string) => void;
  onClose: () => void;
}

const UserProfileModalContext = createContext<UserProfileModalContextType | undefined>(undefined);

export const UserProfileModalProvider = ({ children }: { children: ReactNode }) => {
  const [selectedUserProfileId, setSelectedUserProfileId] = useState('');

  const onOpen = (userId: string) => {
    setSelectedUserProfileId(userId);
  };

  const onClose = () => {
    setSelectedUserProfileId('');
  };

  return (
    <UserProfileModalContext.Provider value={{ selectedUserProfileId, onOpen, onClose }}>
      {children}
    </UserProfileModalContext.Provider>
  );
};

export const useUserProfileModal = () => {
  const context = useContext(UserProfileModalContext);
  if (context === undefined) {
    throw new Error('useUserProfileModal must be used within a UserProfileModalProvider');
  }
  return context;
};


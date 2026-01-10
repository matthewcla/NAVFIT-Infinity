import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { useNavfitStore } from '@/store/useNavfitStore';
import {
    Settings,
    LogOut,
    UserCircle,
    ChevronUp,
    Check,
    LogIn
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User } from '@/domain/auth/types';

interface UserProfileMenuProps {
    collapsed: boolean;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({ collapsed }) => {
    const { currentUser, isAuthenticated, availableUsers, login, logout } = useNavfitStore();

    const handleLogin = (userId: string) => {
        console.log(`Logging in user: ${userId}`);
        login(userId);
    };

    const handleLogout = () => {
        logout();
    };

    const handleSettings = () => {
        console.log("Opening Settings...");
    };

    // If logged out, show simplified state or login prompt
    if (!isAuthenticated || !currentUser) {
        return (
            <div className={cn("p-4 border-t border-slate-800 flex items-center transition-all duration-300", collapsed ? "justify-center" : "justify-between")}>
                <Menu as="div" className="relative w-full flex justify-center">
                   <Menu.Button className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 transition-colors">
                        <LogIn size={20} />
                    </Menu.Button>
                   <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                    >
                        <Menu.Items className={cn(
                            "absolute bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-56 p-1 z-[100] focus:outline-none",
                            collapsed
                                ? "left-full ml-4 bottom-0 origin-bottom-left" // Floating side menu
                                : "bottom-full left-0 mb-2 w-full origin-bottom-left" // Pop up above
                        )}>
                            <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Select User
                            </div>
                            {availableUsers.map(user => (
                                <Menu.Item key={user.id}>
                                    {({ active }) => (
                                        <button
                                            onClick={() => handleLogin(user.id)}
                                            className={cn(
                                                "w-full text-left px-3 py-2 text-sm rounded-md flex items-center space-x-2 transition-colors",
                                                active ? "bg-slate-700 text-white" : "text-slate-300"
                                            )}
                                        >
                                           <div className="w-6 h-6 rounded-full bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-100">
                                                {user.initials}
                                           </div>
                                            <div>
                                                <div className="font-medium">{user.rank} {user.name}</div>
                                                <div className="text-xs text-slate-400 truncate w-32">{user.title}</div>
                                            </div>
                                        </button>
                                    )}
                                </Menu.Item>
                            ))}
                        </Menu.Items>
                    </Transition>
                </Menu>
                {!collapsed && (
                     <div className="ml-3 flex-1 overflow-hidden">
                        <button onClick={() => {/* Trigger menu open programmatically if needed, but button above handles it */}} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                            Log In
                        </button>
                     </div>
                )}
            </div>
        );
    }

    return (
        <Menu as="div" className="relative">
            {({ open }) => (
                <>
                    <Menu.Button className={cn(
                        "w-full p-4 border-t border-slate-800 flex items-center transition-all duration-200 hover:bg-slate-800 focus:outline-none group",
                        collapsed ? "justify-center" : "justify-between"
                    )}>
                        <div className="flex items-center space-x-3 overflow-hidden">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-white font-bold border-2 border-slate-700 group-hover:border-blue-500 transition-colors">
                                {currentUser.initials}
                            </div>
                            {!collapsed && (
                                <div className="text-left overflow-hidden">
                                    <div className="text-sm font-bold text-white truncate">{currentUser.rank} {currentUser.name}</div>
                                    <div className="text-xs text-slate-400 truncate max-w-[140px]">{currentUser.title}</div>
                                </div>
                            )}
                        </div>
                        {!collapsed && (
                            <ChevronUp size={16} className={cn("text-slate-500 transition-transform duration-200", open ? "transform rotate-180" : "")} />
                        )}
                    </Menu.Button>

                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                    >
                        <Menu.Items className={cn(
                            "absolute bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-[100] focus:outline-none divide-y divide-slate-800",
                            collapsed
                                ? "left-full ml-4 bottom-4 w-64 origin-bottom-left" // Floating side menu (wider for details)
                                : "bottom-full left-4 right-4 mb-2 origin-bottom" // Pop up above
                        )}>
                            {/* Header Section in Menu */}
                             <div className="px-3 py-3">
                                <div className="text-xs font-medium text-slate-500">Signed in as</div>
                                <div className="text-sm font-bold text-white mt-0.5">{currentUser.rank} {currentUser.name}</div>
                                <div className="text-xs text-slate-400 truncate">{currentUser.command}</div>
                             </div>

                            {/* Profile Switcher */}
                            <div className="py-1">
                                <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                    <span>Switch Profile</span>
                                </div>
                                {availableUsers.map(user => (
                                    <Menu.Item key={user.id}>
                                        {({ active }) => (
                                            <button
                                                onClick={() => handleLogin(user.id)}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors",
                                                    active ? "bg-slate-800 text-blue-400" : "text-slate-300"
                                                )}
                                                disabled={user.id === currentUser.id}
                                            >
                                                <div className="flex items-center space-x-3 overflow-hidden">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                                                        user.id === currentUser.id ? "bg-blue-600 text-white" : "bg-slate-800 border border-slate-600 text-slate-400"
                                                    )}>
                                                        {user.initials}
                                                    </div>
                                                    <div className="truncate">
                                                        <div className={cn("font-medium truncate", user.id === currentUser.id ? "text-white" : "text-slate-300")}>
                                                            {user.rank} {user.name}
                                                        </div>
                                                        <div className="text-xs text-slate-500 truncate w-32">{user.title}</div>
                                                    </div>
                                                </div>
                                                {user.id === currentUser.id && <Check size={16} className="text-blue-500 flex-shrink-0" />}
                                            </button>
                                        )}
                                    </Menu.Item>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="py-1">
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={handleSettings}
                                            className={cn(
                                                "w-full text-left px-3 py-2 text-sm flex items-center space-x-2 transition-colors",
                                                active ? "bg-slate-800 text-white" : "text-slate-300"
                                            )}
                                        >
                                            <Settings size={16} />
                                            <span>Settings</span>
                                        </button>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={handleLogout}
                                            className={cn(
                                                "w-full text-left px-3 py-2 text-sm flex items-center space-x-2 transition-colors",
                                                active ? "bg-red-900/20 text-red-400" : "text-red-400"
                                            )}
                                        >
                                            <LogOut size={16} />
                                            <span>Log out</span>
                                        </button>
                                    )}
                                </Menu.Item>
                            </div>
                        </Menu.Items>
                    </Transition>
                </>
            )}
        </Menu>
    );
};

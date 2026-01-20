import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { useNavfitStore } from '@/store/useNavfitStore';
import {
    Settings,
    LogOut,
    ChevronUp,
    Check,
    LogIn
} from 'lucide-react';
import { cn } from '@/lib/utils';


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
            <div className={cn("p-4 border-t border-white/5 flex items-center transition-all duration-300 relative", collapsed ? "justify-center" : "justify-between")}>
                {/* Top shine */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <Menu as="div" className="relative w-full flex justify-center">
                    <Menu.Button className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 border border-white/10 flex items-center justify-center text-slate-300 transition-all hover:text-white shadow-[0_0_10px_rgba(0,0,0,0.3)]">
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
                            "absolute bg-slate-950/90 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl w-56 p-1 z-[100] focus:outline-none",
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
                                                active ? "bg-white/5 text-white" : "text-slate-300"
                                            )}
                                        >
                                            <div className="w-6 h-6 rounded-full bg-blue-900/50 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-100">
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
                        <button onClick={() => {/* Trigger menu open programmatically if needed, but button above handles it */ }} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
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
                        "w-full p-4 border-t border-white/5 flex items-center transition-all duration-300 hover:bg-white/5 focus:outline-none group relative",
                        collapsed ? "justify-center" : "justify-between"
                    )}>
                        {/* Top shine */}
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                        <div className="flex items-center space-x-3 overflow-hidden">
                            {/* Avatar with Glow Ring */}
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex-shrink-0 flex items-center justify-center text-white font-bold border border-white/10 shadow-[0_0_15px_rgba(37,99,235,0.3)] group-hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-all duration-300">
                                    {currentUser.initials}
                                </div>
                                <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>

                            {!collapsed && (
                                <div className="text-left overflow-hidden">
                                    <div className="text-sm font-bold text-slate-100 truncate group-hover:text-white transition-colors">
                                        {currentUser.rank} {currentUser.name}
                                    </div>
                                    <div className="text-xs text-slate-400 truncate max-w-[140px] group-hover:text-slate-300 transition-colors">
                                        {currentUser.title}
                                    </div>
                                </div>
                            )}
                        </div>
                        {!collapsed && (
                            <ChevronUp size={16} className={cn("text-slate-500 group-hover:text-slate-300 transition-transform duration-300", open ? "transform rotate-180" : "")} />
                        )}
                    </Menu.Button>

                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="transform opacity-0 scale-95 translate-y-2"
                        enterTo="transform opacity-100 scale-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="transform opacity-100 scale-100 translate-y-0"
                        leaveTo="transform opacity-0 scale-95 translate-y-2"
                    >
                        <Menu.Items className={cn(
                            "absolute bg-slate-950/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] p-1 z-[100] focus:outline-none divide-y divide-white/5",
                            collapsed
                                ? "left-full ml-4 bottom-4 w-64 origin-bottom-left" // Floating side menu (wider for details)
                                : "bottom-full left-4 right-4 mb-2 origin-bottom" // Pop up above
                        )}>
                            {/* Header Section in Menu */}
                            <div className="px-3 py-3 bg-white/5 rounded-t-lg">
                                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Signed in as</div>
                                <div className="text-sm font-bold text-white mt-1">{currentUser.rank} {currentUser.name}</div>
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
                                                    "w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors rounded-md mx-1",
                                                    active ? "bg-white/10 text-blue-300" : "text-slate-300"
                                                )}
                                                disabled={user.id === currentUser.id}
                                            >
                                                <div className="flex items-center space-x-3 overflow-hidden">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border",
                                                        user.id === currentUser.id
                                                            ? "bg-blue-600 text-white border-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                                                            : "bg-slate-800 border-slate-600 text-slate-400"
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
                                                "w-[calc(100%-8px)] mx-1 text-left px-3 py-2 text-sm flex items-center space-x-2 transition-colors rounded-md",
                                                active ? "bg-white/10 text-white" : "text-slate-300"
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
                                                "w-[calc(100%-8px)] mx-1 text-left px-3 py-2 text-sm flex items-center space-x-2 transition-colors rounded-md",
                                                active ? "bg-red-500/10 text-red-400" : "text-red-400"
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

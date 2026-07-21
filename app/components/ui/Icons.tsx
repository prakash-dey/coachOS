import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function Icon({ children, className = "h-4 w-4", ...props }: IconProps) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>{children}</svg>;
}

export const PencilIcon = (props: IconProps) => <Icon {...props}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></Icon>;
export const TrashIcon = (props: IconProps) => <Icon {...props}><path d="M3 6h18"/><path d="M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/></Icon>;
export const CheckIcon = (props: IconProps) => <Icon {...props}><path d="m5 12 4 4L19 6"/></Icon>;
export const SaveIcon = (props: IconProps) => <Icon {...props}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></Icon>;
export const PlusIcon = (props: IconProps) => <Icon {...props}><path d="M12 5v14M5 12h14"/></Icon>;
export const XIcon = (props: IconProps) => <Icon {...props}><path d="m6 6 12 12M18 6 6 18"/></Icon>;
export const UserPlusIcon = (props: IconProps) => <Icon {...props}><path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M19 8v6M16 11h6"/></Icon>;
export const UserMinusIcon = (props: IconProps) => <Icon {...props}><path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M16 11h6"/></Icon>;
export const UnlinkIcon = (props: IconProps) => <Icon {...props}><path d="m18.8 5.2 1.4-1.4M2 2l20 20M6.2 6.2 4.9 7.5a4 4 0 0 0 5.6 5.6l1.4-1.4M12.1 16.3l1.4-1.4a4 4 0 0 0 .5-5"/></Icon>;
export const FlameIcon = (props: IconProps) => <Icon {...props}><path d="M12 22c4 0 7-2.8 7-6.8 0-2.5-1.2-4.8-3.5-6.8.1 1.7-.5 2.8-1.7 3.4.3-3.2-1.2-6-4.4-8.8.2 3.3-1.1 5.2-2.8 7.1C5 11.8 4 13.3 4 15.5 4 19.2 7 22 12 22Z"/><path d="M12 18c1.4 0 2.5-1 2.5-2.4 0-1.1-.6-2-1.7-2.8 0 1-.4 1.6-1.1 2-.1-1.4-.8-2.6-2-3.7.1 1.6-.6 2.5-1.2 3.4-.4.6-.6 1.1-.6 1.8C7.9 17.3 9.4 18 12 18Z"/></Icon>;
export const ProteinIcon = (props: IconProps) => <Icon {...props}><path d="M4 7h16"/><path d="M7 7v10M17 7v10"/><path d="M5 10v4M19 10v4"/><path d="M4 17h16"/></Icon>;
export const MealIcon = (props: IconProps) => <Icon {...props}><path d="M4 3v8"/><path d="M7 3v8"/><path d="M4 7h3"/><path d="M5.5 11v10"/><path d="M15 3a4 4 0 0 1 4 4v5h-4Z"/><path d="M15 12v9"/></Icon>;
export const DashboardIcon = (props: IconProps) => <Icon {...props}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></Icon>;
export const UsersIcon = (props: IconProps) => <Icon {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></Icon>;
export const DumbbellIcon = (props: IconProps) => <Icon {...props}><path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/></Icon>;
export const LeafIcon = (props: IconProps) => <Icon {...props}><path d="M12 22c5-3 8-7 8-12a8 8 0 0 0-16 0c0 5 3 9 8 12Z"/><path d="M8 12c3 0 5-2 6-5M12 22V12"/></Icon>;
export const ClipboardCheckIcon = (props: IconProps) => <Icon {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M9 16l2 2 4-4"/></Icon>;
export const TrendingUpIcon = (props: IconProps) => <Icon {...props}><path d="M3 3v18h18"/><path d="m7 16 4-5 3 3 5-7"/></Icon>;
export const SearchIcon = (props: IconProps) => <Icon {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></Icon>;
export const BellIcon = (props: IconProps) => <Icon {...props}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></Icon>;
export const SettingsIcon = (props: IconProps) => <Icon {...props}><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.65V21a2 2 0 1 1-4 0v-.09A1.8 1.8 0 0 0 8.75 19.3a1.8 1.8 0 0 0-1.98.36l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.8 1.8 0 0 0 4.3 15a1.8 1.8 0 0 0-1.65-1.1H2.5a2 2 0 1 1 0-4h.09A1.8 1.8 0 0 0 4.3 8.75a1.8 1.8 0 0 0-.36-1.98l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.8 1.8 0 0 0 8.75 4.3a1.8 1.8 0 0 0 1.1-1.65V2.5a2 2 0 1 1 4 0v.09a1.8 1.8 0 0 0 1.1 1.71 1.8 1.8 0 0 0 1.98-.36l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.8 1.8 0 0 0 19.4 8.75a1.8 1.8 0 0 0 1.65 1.1h.09a2 2 0 1 1 0 4h-.09A1.8 1.8 0 0 0 19.4 15Z"/></Icon>;
export const LogoutIcon = (props: IconProps) => <Icon {...props}><path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></Icon>;
export const EyeIcon = (props: IconProps) => <Icon {...props}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></Icon>;
export const CalendarIcon = (props: IconProps) => <Icon {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></Icon>;
export const ScaleIcon = (props: IconProps) => <Icon {...props}><path d="M12 3v18M5 7h14"/><path d="M6 7 3 14h6L6 7ZM18 7l-3 7h6l-3-7Z"/></Icon>;

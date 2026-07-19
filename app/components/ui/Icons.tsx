import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" {...props}>{children}</svg>;
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

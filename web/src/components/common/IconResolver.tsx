import React from 'react';
import { 
  Folder, 
  Briefcase, 
  Heart, 
  GraduationCap, 
  House, 
  Sparkle, 
  Calendar,
  User,
  Gear,
  ChartLineUp,
  Database,
  Binoculars,
  List,
  Plus,
  MagnifyingGlass,
  CheckCircle,
  Clock,
  Warning,
  Info
} from '@phosphor-icons/react';

const iconMap: Record<string, React.ElementType> = {
  'Folder': Folder,
  'Briefcase': Briefcase,
  'Heart': Heart,
  'GraduationCap': GraduationCap,
  'House': House,
  'Sparkle': Sparkle,
  'Calendar': Calendar,
  'User': User,
  'Gear': Gear,
  'ChartLineUp': ChartLineUp,
  'Database': Database,
  'Binoculars': Binoculars,
  'List': List,
  'Plus': Plus,
  'MagnifyingGlass': MagnifyingGlass,
  'CheckCircle': CheckCircle,
  'Clock': Clock,
  'Warning': Warning,
  'Info': Info,
};

interface IconResolverProps {
  icon: string;
  size?: number;
  color?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  className?: string;
}

export const IconResolver: React.FC<IconResolverProps> = ({ 
  icon, 
  size = 20, 
  color = 'currentColor', 
  weight = 'regular',
  className = ''
}) => {
  const IconComponent = iconMap[icon] || Folder;
  return <IconComponent size={size} color={color} weight={weight} className={className} />;
};

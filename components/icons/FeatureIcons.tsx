
import React from 'react';

interface IconProps {
  className?: string;
}

export const MicIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15c-3.314 0-6-2.686-6-6v-1.5a6 6 0 1112 0v1.5c0 3.314-2.686 6-6 6z" />
  </svg>
);

export const MicOffIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15c-3.314 0-6-2.686-6-6v-1.5a6 6 0 1112 0v1.5c0 3.314-2.686 6-6 6z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 17.25L6.75 6.75" />
     <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 9.75L12 11.25m0 0L10.5 9.75M12 11.25V5.25" /> {/* Line through mic head for clarity */}
  </svg>
);


export const DownloadIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

export const BrainIcon: React.FC<IconProps> = ({ className }) => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h7.5M3 12c0-2.705 1.044-5.201 2.939-7.061A9.96 9.96 0 0112 3c2.705 0 5.201 1.044 7.061 2.939A9.96 9.96 0 0121 12c0 2.705-1.044 5.201-2.939 7.061A9.96 9.96 0 0112 21c-2.705 0-5.201-1.044-7.061-2.939A9.96 9.96 0 013 12z" />
 </svg>
);

export const LanguagesIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C13.18 6.016 14.064 6.75 15 7.5m-12 5.25h.008v.008H3v-.008zm0 0c.022.002.044.002.066.002H3m3.375 0a48.55 48.55 0 015.25 0A48.532 48.532 0 0118 12.75m-15 0c.729-.019 1.46-.043 2.188-.074M18 12.75c.041.016.077.036.113.058M18 12.75c-.078.002-.157.002-.236.002a48.419 48.419 0 00-5.026 0A48.419 48.419 0 006.75 12.75M18 12.75C19.06 12.75 20.07 13.018 21 13.499M6.75 12.75c-.969 0-1.925.034-2.862.097M6.75 12.75c.689 0 1.372-.023 2.038-.065m0 0c.078-.002.157-.002.236-.002m0 0a48.419 48.419 0 005.026 0m0 0c-.078.002-.157.002-.236 0M3.75 9h.008v.008H3.75V9zm0 0c.022.002.044.002.066.002H3.75m14.25 0h.008v.008H18V9zm0 0c.022.002.044.002.066.002H18m-.066 5.999A48.347 48.347 0 0012 15a48.347 48.347 0 00-5.934-.001" />
  </svg>
);

export const LightbulbIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.354a11.955 11.955 0 01-5.625 0M12 3v2.25m0 0a6.01 6.01 0 001.5.189m-1.5-.189a6.01 6.01 0 01-1.5-.189M12 21a9.002 9.002 0 004.5-1.228m-9 0A9.002 9.002 0 0012 21zm7.553-12.077A6.999 6.999 0 0012 6.001c-1.583 0-3.037.522-4.207 1.402l-.793.657m8.001 0l.793-.657m0 0a7.003 7.003 0 00-4.208-5.85M12 6.001V3m0 0L10.5 1.5M12 3l1.5-1.5" />
  </svg>
);

export const ListChecksIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const ChatBubbleIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.72 3.72a1.05 1.05 0 01-1.664-1.05c.123-.383.217-.78.217-1.194V18.75h-2.25m-10.5-.001v-2.25H5.625c-.621 0-1.125-.504-1.125-1.125V9.75c0-.621.504-1.125 1.125-1.125h1.5c.621 0 1.125.504 1.125 1.125v3.75m0 0H12.75M5.625 13.5H12m2.25-2.25V5.625c0-.621-.504-1.125-1.125-1.125H9.75c-.621 0-1.125.504-1.125 1.125V11.25m0 0h3.75m.001.001H15m2.25-2.25V5.625c0-.621-.504-1.125-1.125-1.125H9.75c-.621 0-1.125.504-1.125 1.125V11.25m0 0h3.75" />
  </svg>
);

export const SendIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
);

export const FileAudioIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l3-1.5v3.75l-3 1.5v-3.75z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25a1.875 1.875 0 112.652 2.652L10.5 16.5v-2.625c0-.414.168-.786.44-1.057l.21-.214z" />
  </svg>
);

export const VolumeUpIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
  </svg>
);

export const EditIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

export const UserCircleIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

export const LoginIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
);

export const LogoutIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
);

export const SaveIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 13.5l3 3m0 0l3-3m-3 3v-6m1.06-4.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </svg>
);


export const CogIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.003 1.11-1.226l.043-.023c.296-.142.613-.203.928-.203.314 0 .632.061.927.203l.043.023c.549.223 1.02.684 1.11 1.226C14.896 5.205 15 6.13 15 7.088v.033c0 .959-.104 1.883-.294 2.758l.116.01A15.001 15.001 0 0112 21c-3.371 0-6.432-1.158-8.822-3.116l.116-.01C3.104 17.005 3 16.082 3 15.122v-.033C3 6.13 3.104 5.205 3.294 4.332l.004-.02c.09-.542.56-1.003 1.11-1.226l.043-.023C4.746 2.932 5.063 2.87 5.378 2.87c.315 0 .632.061.927.203l.043.023c.55.223 1.02.684 1.11 1.226C7.604 5.205 7.708 6.13 7.708 7.088v.033c0 .959-.104 1.883-.294 2.758L6 10m12 0l-1.414-1.116M6 10l-1.414-1.116M12 21V10m0 0L6 6m6 4l6-4M12 6a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" />
  </svg>
);

export const ArchiveIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10.5 11.25h3M12 3.75l-3.75 3.75M12 3.75l3.75 3.75" />
  </svg>
);

export const LoadIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

export const TrashIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

export const UserPlusIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.5 21h-1c-2.134 0-4.096-.746-5.662-1.986a11.932 11.932 0 01-1.09-.874z" />
  </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className ?? "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-1.003 1.11-1.226l.043-.023c.296-.142.613-.203.928-.203.314 0 .632.061.927.203l.043.023c.549.223 1.02.684 1.11 1.226C14.896 5.205 15 6.13 15 7.088v.033c0 .959-.104 1.883-.294 2.758l.116.01A15.001 15.001 0 0112 21c-3.371 0-6.432-1.158-8.822-3.116l.116-.01C3.104 17.005 3 16.082 3 15.122v-.033C3 6.13 3.104 5.205 3.294 4.332l.004-.02c.09-.542.56-1.003 1.11-1.226l.043-.023C4.746 2.932 5.063 2.87 5.378 2.87c.315 0 .632.061.927.203l.043.023C6.34 3.099 6.814 3.38 7.207 3.723m.008 3.706H7.207m-.008 0H7.207m0 0v.008m0-.008H7.207m0 0L6 6m6 12c-3.371 0-6.432-1.158-8.822-3.116M12 18c.398 0 .787-.024 1.17-.069M12 18c-.398 0-.787-.024-1.17-.069m2.34 0V12m-2.34 0V12m2.34 6v-2.31M12 18v-2.31m0 0V12m0 0V6m2.34 6v-2.31M12 12v-2.31m0 0V6m0 0h2.34m-2.34 0H9.66m2.34 0V3.69M12 6V3.69m0 0H9.66M12 3.69h2.34" />
  </svg>
);

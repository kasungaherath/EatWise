const paths = {
  profile: 'M20 21v-2a7 7 0 0 0-14 0v2M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  nutrition: 'M21 12a9 9 0 1 1-9-9M17 12a5 5 0 1 1-5-5M21 3l-9 9M12 8v4h4',
  preferences: 'M4 7h9m4 0h3M4 17h3m4 0h9M13 4v6m-6 4v6',
  foodDraft: 'M3 11h18a9 9 0 0 1-18 0Zm4 10h10M8 3v4m4-4v4m4-4v4',
  generation: 'M12 2C12 7.52 7.52 12 2 12c5.52 0 10 4.48 10 10 0-5.52 4.48-10 10-10C16.48 12 12 7.52 12 2Z',
  saved: 'M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16l-6-4-6 4Z',
}

export default function WorkspaceIcon({ name, size = 22 }) {
  const sparkle = name === 'generation'
  return (
    <svg className="ew-workspace-icon" width={size} height={size} viewBox="0 0 24 24" fill={sparkle ? 'currentColor' : 'none'} stroke={sparkle ? 'none' : 'currentColor'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={paths[name]} />
    </svg>
  )
}

export default function DownloadEverything({ className = '', label = 'Download web project ↓' }) {
  const href = `${import.meta.env.BASE_URL}downloads/Shattered_Memories_Web.zip`
  return (
    <a className={className} href={href} download="Shattered_Memories_Web.zip">
      {label}
    </a>
  )
}

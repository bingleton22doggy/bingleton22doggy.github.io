import { Link } from 'react-router-dom'

export default function PageNotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#08080a] p-6 text-[#e8e4da]">
      <div className="max-w-md text-center">
        <p className="text-6xl text-[#b06a3c]">404</p>
        <h1 className="sm-title mt-4 text-3xl">This hallway ends here.</h1>
        <p className="mt-4 text-sm text-[#8d867a]">That page does not exist in this build.</p>
        <Link to="/" className="sm-btn mt-8 inline-flex">Return to the entrance</Link>
      </div>
    </main>
  )
}

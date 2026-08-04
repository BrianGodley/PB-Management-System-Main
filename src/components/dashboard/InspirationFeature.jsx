// Inspiration dashboard feature — shows one quote per day from a built-in
// library. The index is derived from the day-of-year so it's the same for
// everyone on a given day and rotates daily. No network needed.
import { useMemo } from 'react'

const QUOTES = [
  { t: 'The best way to get started is to quit talking and begin doing.', a: 'Walt Disney' },
  { t: 'It always seems impossible until it’s done.', a: 'Nelson Mandela' },
  { t: 'Quality is not an act, it is a habit.', a: 'Aristotle' },
  { t: 'Well done is better than well said.', a: 'Benjamin Franklin' },
  { t: 'The secret of getting ahead is getting started.', a: 'Mark Twain' },
  { t: 'Whether you think you can or you can’t, you’re right.', a: 'Henry Ford' },
  { t: 'Success is not final, failure is not fatal.', a: 'Winston Churchill' },
  { t: 'Hard work beats talent when talent doesn’t work hard.', a: 'Tim Notke' },
  { t: 'A goal without a plan is just a wish.', a: 'Antoine de Saint-Exupéry' },
  { t: 'Do what you can, with what you have, where you are.', a: 'Theodore Roosevelt' },
  { t: 'Great things are done by a series of small things brought together.', a: 'Vincent van Gogh' },
  { t: 'The only way to do great work is to love what you do.', a: 'Steve Jobs' },
  { t: 'Act as if what you do makes a difference. It does.', a: 'William James' },
  { t: 'Motivation gets you going; habit keeps you growing.', a: 'John C. Maxwell' },
  { t: 'You miss 100% of the shots you don’t take.', a: 'Wayne Gretzky' },
  { t: 'What we think, we become.', a: 'Buddha' },
  { t: 'Start where you are. Use what you have. Do what you can.', a: 'Arthur Ashe' },
  { t: 'The future depends on what you do today.', a: 'Mahatma Gandhi' },
  { t: 'Perseverance is not a long race; it is many short races.', a: 'Walter Elliot' },
  { t: 'Opportunities don’t happen. You create them.', a: 'Chris Grosser' },
  { t: 'Little by little, one travels far.', a: 'J.R.R. Tolkien' },
  { t: 'If you want to lift yourself up, lift up someone else.', a: 'Booker T. Washington' },
  { t: 'Believe you can and you’re halfway there.', a: 'Theodore Roosevelt' },
  { t: 'Discipline is the bridge between goals and accomplishment.', a: 'Jim Rohn' },
  { t: 'The harder I work, the luckier I get.', a: 'Samuel Goldwyn' },
  { t: 'Done is better than perfect.', a: 'Sheryl Sandberg' },
  { t: 'Fall seven times, stand up eight.', a: 'Japanese Proverb' },
  { t: 'A river cuts through rock not by power but by persistence.', a: 'Jim Watkins' },
  { t: 'Continuous improvement is better than delayed perfection.', a: 'Mark Twain' },
  { t: 'The way to get started is to quit talking and begin doing.', a: 'Walt Disney' },
  { t: 'Small daily improvements are the key to staggering long-term results.', a: 'Robin Sharma' },
  { t: 'Energy and persistence conquer all things.', a: 'Benjamin Franklin' },
  { t: 'Either you run the day or the day runs you.', a: 'Jim Rohn' },
  { t: 'Dream big and dare to fail.', a: 'Norman Vaughan' },
  { t: 'Focus on being productive instead of busy.', a: 'Tim Ferriss' },
]

// 1-based day of the year (1–366).
function dayOfYear() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now - start) / 86400000)
}

export default function InspirationFeature({ style }) {
  const q = useMemo(() => QUOTES[dayOfYear() % QUOTES.length], [])
  return (
    <div className="card flex flex-col justify-center" style={style}>
      <h3 className="text-sm font-bold text-gray-800 mb-4">✨ Inspiration</h3>
      <blockquote>
        <p className="text-lg font-medium leading-snug text-gray-800">“{q.t}”</p>
        <footer className="mt-3 text-sm text-gray-500">— {q.a}</footer>
      </blockquote>
    </div>
  )
}

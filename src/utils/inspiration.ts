export interface Inspiration {
  verse: string;
  verseReference: string;
  quote: string;
  quoteAuthor: string;
}

const INSPIRATION_DATABASE: Inspiration[] = [
  {
    verse: "Do not conform to the pattern of this world, but be transformed by the renewing of your mind.",
    verseReference: "Romans 12:2",
    quote: "The only way to do great work is to love what you do.",
    quoteAuthor: "Steve Jobs"
  },
  {
    verse: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
    verseReference: "Joshua 1:9",
    quote: "You have power over your mind - not outside events. Realize this, and you will find strength.",
    quoteAuthor: "Marcus Aurelius"
  },
  {
    verse: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.",
    verseReference: "Isaiah 40:31",
    quote: "Sometimes it is the people no one can imagine anything of who do the things no one can imagine.",
    quoteAuthor: "Alan Turing"
  },
  {
    verse: "For I know the plans I have for you, plans to prosper you and not to harm you, plans to give you hope and a future.",
    verseReference: "Jeremiah 29:11",
    quote: "We suffer more often in imagination than in reality.",
    quoteAuthor: "Seneca"
  },
  {
    verse: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
    verseReference: "Proverbs 3:5-6",
    quote: "It does not matter how slowly you go as long as you do not stop.",
    quoteAuthor: "Confucius"
  },
  {
    verse: "I can do all this through him who gives me strength.",
    verseReference: "Philippians 4:13",
    quote: "The best way to predict the future is to invent it.",
    quoteAuthor: "Alan Kay"
  },
  {
    verse: "Be strong and take heart, all you who hope in the Lord.",
    verseReference: "Psalm 31:24",
    quote: "Quality is not an act, it is a habit.",
    quoteAuthor: "Aristotle"
  },
  {
    verse: "For God has not given us a spirit of fear, but of power and of love and of a sound mind.",
    verseReference: "2 Timothy 1:7",
    quote: "Simplicity is the ultimate sophistication.",
    quoteAuthor: "Leonardo da Vinci"
  },
  {
    verse: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.",
    verseReference: "Colossians 3:23",
    quote: "Make it simple, but significant.",
    quoteAuthor: "Don Draper"
  },
  {
    verse: "Let all that you do be done in love.",
    verseReference: "1 Corinthians 16:14",
    quote: "Strive not to be a success, but rather to be of value.",
    quoteAuthor: "Albert Einstein"
  },
  {
    verse: "Commit to the Lord whatever you do, and he will establish your plans.",
    verseReference: "Proverbs 16:3",
    quote: "The details are not the details. They make the design.",
    quoteAuthor: "Charles Eames"
  },
  {
    verse: "And let us not grow weary of doing good, for in due season we will reap, if we do not give up.",
    verseReference: "Galatians 6:9",
    quote: "Focus on being productive instead of busy.",
    quoteAuthor: "Tim Ferriss"
  },
  {
    verse: "The Lord is my light and my salvation—whom shall I fear? The Lord is the stronghold of my life—of whom shall I be afraid?",
    verseReference: "Psalm 27:1",
    quote: "An obstacle is often a stepping stone.",
    quoteAuthor: "Prescott"
  },
  {
    verse: "Be still, and know that I am God.",
    verseReference: "Psalm 46:10",
    quote: "The starting point of all achievement is desire.",
    quoteAuthor: "Napoleon Hill"
  },
  {
    verse: "Iron sharpens iron, and one man sharpens another.",
    verseReference: "Proverbs 27:17",
    quote: "Well done is better than well said.",
    quoteAuthor: "Benjamin Franklin"
  }
];

/**
 * Consistently returns a selected Bible verse and quote that rotates every 2 hours.
 */
export const getDailyInspiration = (date: Date): Inspiration => {
  // Generate a stable seed from date that changes every 2 hours
  const hoursSinceEpoch = Math.floor(date.getTime() / (1000 * 60 * 60));
  const twoHourIntervals = Math.floor(hoursSinceEpoch / 2);
  
  const index = Math.abs(twoHourIntervals) % INSPIRATION_DATABASE.length;
  return INSPIRATION_DATABASE[index];
};

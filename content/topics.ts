export interface CuratedTopic {
  /** Wikipedia search query. */
  query: string;
  /** The question the case should ask. */
  angle: string;
}

/**
 * Well-documented, family-friendly history and science questions with an answer the sources agree on.
 * The seed uses them in order for daily cases, skipping any that fail verification.
 */
export const curatedTopics: CuratedTopic[] = [
  { query: "Hundred Days Napoleon return from Elba", angle: "How did Napoleon retake France in 20 days without an army?" },
  { query: "1854 Broad Street cholera outbreak John Snow", angle: "How did John Snow find the source of the 1854 cholera outbreak?" },
  { query: "Vasa ship 1628 sinking", angle: "Why did the Swedish warship Vasa sink on its maiden voyage?" },
  { query: "Year Without a Summer 1816 Tambora", angle: "What caused the Year Without a Summer in 1816?" },
  { query: "Piltdown Man hoax", angle: "How was the Piltdown Man fossil exposed as a hoax?" },
  { query: "Tacoma Narrows Bridge 1940 collapse", angle: "Why did the Tacoma Narrows Bridge shake itself apart in 1940?" },
  { query: "Discovery of Neptune Le Verrier", angle: "How did astronomers find Neptune before anyone had seen it?" },
  { query: "Rosetta Stone decipherment Champollion", angle: "How did the Rosetta Stone help crack Egyptian hieroglyphs?" },
  { query: "Discovery of penicillin Alexander Fleming", angle: "How did a contaminated dish lead to penicillin?" },
  { query: "Eratosthenes circumference of the Earth", angle: "How did Eratosthenes measure the Earth with shadows?" },
  { query: "John Harrison marine chronometer longitude", angle: "How did a clockmaker solve the longitude problem?" },
  { query: "Great Stink 1858 London sewerage Bazalgette", angle: "How did the Great Stink of 1858 change London?" },
  { query: "Antikythera mechanism", angle: "What was the Antikythera mechanism built to do?" },
  { query: "James Lind scurvy citrus trial", angle: "How did sailors learn to prevent scurvy?" },
  { query: "Mutiny on the Bounty Pitcairn Islands mutineers", angle: "Where did the Bounty mutineers disappear to?" },
  { query: "Great Fire of London 1666", angle: "How did the Great Fire of London start, and why did it spread so far?" },
  { query: "Dead Sea Scrolls discovery Qumran caves", angle: "How were the Dead Sea Scrolls found?" },
  { query: "Galilean moons discovery Galileo 1610", angle: "How did Galileo discover moons circling Jupiter?" },
  { query: "Dust Bowl causes Great Plains 1930s", angle: "What turned the Great Plains into the Dust Bowl?" },
  { query: "Operation Mincemeat 1943", angle: "How did a fake briefcase mislead the German high command in 1943?" },
  { query: "Ignaz Semmelweis puerperal fever handwashing", angle: "How did Semmelweis work out why so many new mothers fell ill in his hospital?" },
  { query: "Photo 51 DNA double helix discovery", angle: "How was the double helix structure of DNA discovered?" },
  { query: "Halley's Comet Edmond Halley prediction 1758", angle: "How did Edmond Halley predict a comet's return?" },
  { query: "Imperial Trans-Antarctic Expedition Endurance rescue", angle: "How did every member of Shackleton's Endurance crew survive?" },
  { query: "Apollo 13 oxygen tank", angle: "How did the Apollo 13 crew get home after an explosion in space?" },
  { query: "Cottingley Fairies photographs", angle: "How were the Cottingley Fairies photographs made, and how was the truth revealed?" },
  { query: "Discovery of radium Marie Curie Pierre Curie", angle: "How did Marie and Pierre Curie discover radium?" },
  { query: "Kensington Runestone authenticity", angle: "Is the Kensington Runestone really a Viking relic?" },
  { query: "Benjamin Franklin kite experiment lightning electricity", angle: "How did Franklin show that lightning is electricity?" },
  { query: "Great Moon Hoax 1835 The Sun", angle: "How did a New York newspaper convince readers there was life on the Moon?" },
];

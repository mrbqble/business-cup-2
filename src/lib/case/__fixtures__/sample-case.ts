import type { CaseContent, SourceText } from "../schema";

/** Synthetic source written for tests; every clue quote below appears in it verbatim. */
export const sampleSource: SourceText = {
  id: "S1",
  title: "1854 Broad Street cholera outbreak",
  url: "https://en.wikipedia.org/wiki/1854_Broad_Street_cholera_outbreak",
  revisionId: 1234567,
  text: [
    "In August 1854 a severe outbreak of cholera struck the Soho district of London.",
    "Snow plotted each death on a map of the Soho streets.",
    "Most of the deaths clustered around the public water pump on Broad Street.",
    "Workers at the nearby brewery drank beer from their own well and stayed healthy.",
    "A workhouse with its own water supply reported almost no deaths among its 500 inmates.",
    "A widow in Hampstead, who preferred the taste of the Broad Street water, had it delivered and died of cholera.",
    "After the parish removed the handle of the pump, the number of new cases fell sharply.",
    "Inspectors found no unusual rat activity in the affected streets that summer.",
    "The well had been dug only three feet from an old cesspit that had begun to leak.",
  ].join("\n"),
};

export function sampleCase(): CaseContent {
  return {
    title: "How did John Snow find the source of the 1854 cholera outbreak?",
    category: "history",
    era: "1854 London",
    clues: [
      clue("c1", "A map of every death", "Snow plotted each death on a map of the Soho streets.", ["h1"], []),
      clue("c2", "Deaths around one pump", "Most of the deaths clustered around the public water pump on Broad Street.", ["h1"], []),
      clue("c3", "The brewery workers", "Workers at the nearby brewery drank beer from their own well and stayed healthy.", ["h1"], ["h2"]),
      clue("c4", "The workhouse well", "A workhouse with its own water supply reported almost no deaths among its 500 inmates.", [], ["h2"]),
      clue("c5", "The widow in Hampstead", "A widow in Hampstead, who preferred the taste of the Broad Street water, had it delivered and died of cholera.", ["h1"], ["h3"]),
      clue("c6", "The missing handle", "After the parish removed the handle of the pump, the number of new cases fell sharply.", ["h1"], []),
      clue("c7", "No rats", "Inspectors found no unusual rat activity in the affected streets that summer.", [], ["h4"]),
      clue("c8", "The leaking cesspit", "The well had been dug only three feet from an old cesspit that had begun to leak.", ["h1"], []),
    ],
    hypotheses: [
      { id: "h1", text: "Contaminated water from the Broad Street pump spread the disease.", correct: true },
      { id: "h2", text: "Foul air rising from the sewers caused the outbreak.", correct: false },
      { id: "h3", text: "Spoiled food sold at the Soho market spread the disease.", correct: false },
      { id: "h4", text: "Rats from the docks carried the disease into Soho.", correct: false },
    ],
    solution: [
      { text: "Snow mapped the deaths and saw them gather around the Broad Street pump.", clueIds: ["c1", "c2"] },
      { text: "People who drank other water stayed healthy, while a widow who drank pump water far away died.", clueIds: ["c3", "c4", "c5"] },
      { text: "The well sat next to a leaking cesspit, and cases fell once the pump handle was removed.", clueIds: ["c6", "c8"] },
    ],
    learned: [
      "Mapping cases can reveal the source of an outbreak.",
      "Cholera spreads through contaminated water, not foul air.",
      "Removing the pump handle became a founding story of epidemiology.",
    ],
  };
}

function clue(id: string, headline: string, quote: string, supports: string[], refutes: string[]) {
  return { id, headline, body: `Evidence: ${headline.toLowerCase()}.`, quote, sourceId: "S1", kind: "record" as const, supports, refutes };
}

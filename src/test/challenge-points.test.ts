import { describe, it, expect } from "vitest";
import { pointsFor } from "@/components/app/QuizPanel";
const base = { correct: 1, wrong: 0.5 };
const rules = [
  { from_attempt: 2, to_attempt: 2, correct_points: 0.5, wrong_points: 2, created_at: "a" },
  { from_attempt: 3, to_attempt: 3, correct_points: 0.3, wrong_points: 3, created_at: "a" },
  { from_attempt: 10, to_attempt: 20, correct_points: 0.1, wrong_points: 10, created_at: "a" },
];
describe("challenge points", () => {
  it("first round uses base", () => expect(pointsFor(1, base, rules)).toEqual(base));
  it("2nd challenge", () => expect(pointsFor(2, base, rules)).toEqual({ correct: 0.5, wrong: 2 }));
  it("3rd challenge", () => expect(pointsFor(3, base, rules)).toEqual({ correct: 0.3, wrong: 3 }));
  it("range 10-20", () => expect(pointsFor(15, base, rules)).toEqual({ correct: 0.1, wrong: 10 }));
  it("unset falls back", () => expect(pointsFor(5, base, rules)).toEqual(base));
});

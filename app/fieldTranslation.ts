import fields from "../locale/fields.csv";
import { string } from "prop-types";

export default function lookup(english: string): string {
  const x = fields;
  const match = fields.find(f => f.En === english);
  if (match) {
    return match.Es;
  }
  return english;
}

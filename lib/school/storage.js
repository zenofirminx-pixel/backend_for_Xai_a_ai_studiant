import fs from "fs";

const FILE_PATH = "./data/school.json";

export function saveSchoolData(data) {
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
}

export function loadSchoolData() {
  if (!fs.existsSync(FILE_PATH)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(FILE_PATH, "utf-8"));
}
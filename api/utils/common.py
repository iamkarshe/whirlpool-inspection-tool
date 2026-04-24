import csv
import io

from fastapi import HTTPException, UploadFile


def to_proper_case(value: str) -> str:
    return " ".join(word.capitalize() for word in value.strip().split())


def read_csv_upload(file: UploadFile, required_headers: set[str]) -> list[dict[str, str]]:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file")

    content = file.file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="CSV is empty")

    missing_headers = required_headers.difference(set(reader.fieldnames))
    if missing_headers:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required headers: {', '.join(sorted(missing_headers))}",
        )

    return [dict(row) for row in reader]

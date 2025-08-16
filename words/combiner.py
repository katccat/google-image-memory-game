import sys
from pathlib import Path

def combine_files(input_files, output_file):
    seen = set()
    combined_lines = []

    for file_path in input_files:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                for line in f:
                    stripped = line.strip()
                    if stripped and stripped not in seen:
                        seen.add(stripped)
                        combined_lines.append(stripped)
        except FileNotFoundError:
            print(f"Warning: {file_path} not found, skipping.")
    
    # Write output
    with open(output_file, "w", encoding="utf-8") as out:
        for line in combined_lines:
            out.write(line + "\n")

def main():
    if len(sys.argv) < 3:
        print("Usage: python combine_txt.py input1.txt input2.txt ... output.txt")
        sys.exit(1)

    *input_files, output_file = sys.argv[1:]
    combine_files(input_files, output_file)

if __name__ == "__main__":
    main()

import re
import sys

def filter_brackets(input_file, output_file):
	# Pattern matches any bracket pair or brackets with numbers, e.g. [23], (abc), {xyz}
	pattern = r'[\[\(\{][^\[\]\(\)\{\}]*[\]\)\}]'
	with open(input_file, 'r', encoding='utf-8') as fin, open(output_file, 'w', encoding='utf-8') as fout:
		for line in fin:
			# Remove all bracket pairs
			filtered_line = re.sub(pattern, '', line)
			fout.write(filtered_line)

if __name__ == "__main__":
	if len(sys.argv) != 3:
		print("Usage: python filter.py input.txt output.txt")
		sys.exit(1)
	filter_brackets(sys.argv[1], sys.argv[2])
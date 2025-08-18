import re
import json
from nltk.corpus import wordnet
from nltk.corpus import gutenberg
from nltk import word_tokenize, pos_tag
from nltk.stem import WordNetLemmatizer
from collections import Counter

output_file = "dictionary.txt"#sys.argv[1]

# Acceptable WordNet categories
whitelist = {
	'noun.animal',
	'noun.food',
	'noun.plant',
	'noun.object',
}
disallowed_categories = {
	'noun.cognition',
	'noun.communication',
	'noun.feeling',
	'noun.event',
	'noun.act',
	'noun.person',
	'noun.body',
	'noun.attribute',
	'noun.act',
	'noun.quantity',
	'noun.state',
	'noun.time',
	'noun.relation',
	'noun.group',
	'noun.Tops',
	'noun.phenomenon',
	'noun.process',
}

gutenberg_texts = [
    #'carroll-alice.txt',
    #'burgess-busterbrown.txt',
    #'bryant-stories.txt',
    #'edgeworth-parents.txt',
	#'austen-emma.txt',
	#'austen-sense.txt',
]

corpora = [
	'corpora/doawk.txt',
	'corpora/giantpeach.txt',
	'corpora/chocolatefactory.txt',
	'corpora/fastfood.txt',
	'corpora/toys.txt',
	'corpora/pets.txt',
	'corpora/dessert.txt',
	'corpora/sports.txt',
	'corpora/vehicles.txt',
	'corpora/rye.txt',
]

word_lists = [
	'word-lists/foods.txt',
]

min_frequency = 2
min_noun_to_verb_ratio = 0.15
min_noun_to_adj_ratio = 0.35
min_length = 3
max_words_in_compound = 2

# Only alphabetic words without hyphens or periods
pattern = re.compile(r"^[a-zA-Z]+$")

nouns = []
lemmatizer = WordNetLemmatizer()
rejected_words = []
with open('rejected.json', 'r', encoding='utf-8') as file:
	rejected_words_json = json.load(file)
	rejected_words = rejected_words_json['rejectedWords']

def is_noun_allowed(noun):
	if noun in rejected_words:
		return False
	if not pattern.fullmatch(noun) or len(noun) <= min_length:
		return False
	noun_synsets = wordnet.synsets(noun, wordnet.NOUN)
	noun_synset_count = len(noun_synsets)
	if noun_synset_count < 1:
		return False
	if any(synset.lexname() in disallowed_categories for synset in noun_synsets):
		return False
	if any(synset.lexname() in whitelist for synset in noun_synsets):
		return True
	return (
		pos_test(noun, noun_synset_count, wordnet.VERB, min_noun_to_verb_ratio) and 
		pos_test(noun, noun_synset_count, wordnet.ADJ, min_noun_to_adj_ratio) 
	)

def pos_test(test_noun, noun_synset_count, pos, min_ratio_to_pos):
	if (min_ratio_to_pos > 0):
		pos_synsets = wordnet.synsets(test_noun, pos)
		pos_synset_count = len(pos_synsets)
		if (pos_synset_count > 0):
			ratio = noun_synset_count / pos_synset_count
			if ratio < min_ratio_to_pos:
				print(f"Possible {pos} rejected: {test_noun} ({ratio})")
				rejected_words.append(test_noun)
				return False
	return True

def process_corpus(text):
	words = word_tokenize(text)
	tagged = pos_tag(words)
	for word, tag in tagged:
		if tag in ('NN', 'NNS') and not(tag in ('NNP', 'NNPS')):
			lemma = lemmatizer.lemmatize(word.lower(), wordnet.NOUN)
			if is_noun_allowed(lemma):
				nouns.append(lemma)

def process_word_list(text):
	words = text.splitlines()
	for word in words:
		if len(word_tokenize(word)) <= max_words_in_compound:
			nouns.append(word.lower())

for fileid in gutenberg_texts:
	process_corpus(gutenberg.raw(fileid))

for file in corpora:
	with open(file, "r", encoding="utf-8", errors="ignore") as f:
		process_corpus(f.read())

for file in word_lists:
	with open(file, "r", encoding="utf-8", errors="ignore") as f:
		process_word_list(f.read())

# Count and keep most common
noun_counts = Counter(nouns)

# Filter words by minimum frequency
filtered_words = [(word, freq) for word, freq in noun_counts.items() if freq >= min_frequency]

# Sort the filtered words by frequency in descending order
sorted_words = sorted(filtered_words, key=lambda pair: pair[1], reverse=True)

# Extract just the words from the sorted list
top_nouns = [word for word, freq in sorted_words]

with open(output_file, "w", encoding="utf-8", errors="ignore") as io:
    io.write("\n".join(top_nouns))

print(f"Found {len(top_nouns)} simple nouns.")
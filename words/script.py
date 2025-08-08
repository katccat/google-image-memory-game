import sys
import re
from nltk.corpus import wordnet
from nltk.corpus import gutenberg
from nltk import word_tokenize, pos_tag
from nltk.stem import WordNetLemmatizer
from collections import Counter

output_file = "dictionary.txt"#sys.argv[1]

# Acceptable WordNet categories
allowed_categories = {
	'noun.animal',
	'noun.artifact',
	'noun.food',
	'noun.person',
	'noun.plant',
	'noun.body',
	'noun.object',
	#'noun.location',
	'noun.shape',
	'noun.substance',
}

gutenberg_texts = [
    'carroll-alice.txt',
    'burgess-busterbrown.txt',
    'bryant-stories.txt',
    'edgeworth-parents.txt',
	'austen-emma.txt',
	'austen-sense.txt',
]

texts = [
	'texts/doawk.txt',
]

min_frequency = 4
min_noun_to_verb_ratio = 0.55
min_length = 3

# Only lowercase words
pattern = re.compile(r"^[a-zA-Z]+$")

nouns = []
lemmatizer = WordNetLemmatizer()

def is_noun_allowed(noun):
	if not pattern.fullmatch(noun) or len(noun) <= min_length:
		return False
	noun_synsets = wordnet.synsets(noun, wordnet.NOUN)
	noun_synset_count = len(noun_synsets)
	if not any(synset.lexname() in allowed_categories for synset in noun_synsets):
		return False
	verb_synsets = wordnet.synsets(noun, wordnet.VERB)
	verb_synset_count = len(verb_synsets)
	if (verb_synset_count > 0):
		ratio = noun_synset_count / verb_synset_count
		if ratio < min_noun_to_verb_ratio:
			#print(f"Excluded because mostly verb: {noun} ({ratio})")
			return False
	return True

def process_corpus(text):
	words = word_tokenize(text)
	tagged = pos_tag(words)
	for word, tag in tagged:
		if tag in ('NN', 'NNS'):
			lemma = lemmatizer.lemmatize(word.lower(), wordnet.NOUN)
			# Must be lowercase, concrete, and somewhat common
			if is_noun_allowed(lemma):
				nouns.append(lemma)

for fileid in gutenberg_texts:
	process_corpus(gutenberg.raw(fileid))

for file in texts:
	with open(file, "r", encoding="utf-8") as f:
		text = f.read()
		process_corpus(text)

# Count and keep most common
noun_counts = Counter(nouns)

word_freq_pairs = [
    (word, freq)                # take the "word"
    for word, freq              # loop over each key/value pair
    in noun_counts.items()      # from the dictionary noun_counts
    if freq >= min_frequency    # but only keep it if the frequency is high enough
]

word_freq_pairs = sorted(word_freq_pairs, key=lambda x: x[1], reverse=True)

top_nouns = [word for word, freq in word_freq_pairs]

with open(output_file, "w", encoding="utf-8") as f:
	print(*top_nouns, sep="\n", file=f)
print(f"Found {len(top_nouns)} simple nouns.")
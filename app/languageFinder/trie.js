function Trie() {
  this.size = 0;
}

/**
 * Inserts a word into the Trie.
 *
 * @param{string} word - the word to insert
 *
 * @returns{Trie} the inserted (or existing) node corresponding to the word
 */
Trie.prototype.insert = function (word) {
  var node = this;
  for (var i = 0; i < word.length; i++) {
    var letter = word.charAt(i);
    var child = node[letter];
    if (!child) child = node[letter] = new Trie();
    node = child;
  }
  if (node.word !== word) {
    node.word = word;
    this.size++;
  }
  return node;
};

/**
 * Helper function for search.
 *
 * @param{string}   letter - the letter to search for at this node
 * @param{string}   word - the full word you're searching for
 * @param{number[]} previousRow - the previous row of the Levenshtein algorithm
 * @param{object}   results - object to put the results into (key is word, value is {node, dist})
 * @param{number}   maxDist - will bail on tree paths whose Levenshtein distance is greater than maxDist
 */
Trie.prototype._searchRecursive = function (
  letter,
  word,
  previousRow,
  results,
  maxDist
) {
  var lastColumn = word.length;
  var currentRow = [previousRow[0] + 1];

  for (var column = 1; column <= lastColumn; column++) {
    var insertDist = currentRow[column - 1] + 1;
    var deleteDist = previousRow[column] + 1;
    var replaceDist =
      word.charAt(column - 1) === letter
        ? previousRow[column - 1]
        : previousRow[column - 1] + 1;

    currentRow[column] = Math.min(insertDist, deleteDist, replaceDist);
  }

  if (currentRow[lastColumn] <= maxDist && this.word) {
    results[this.word] = { node: this, dist: currentRow[lastColumn] };
  }

  if (Math.min.apply(undefined, currentRow) <= maxDist) {
    for (var letter in this) {
      if (this.hasOwnProperty(letter) && letter.length === 1) {
        this[letter]._searchRecursive(
          letter,
          word,
          currentRow,
          results,
          maxDist
        );
      }
    }
  }
};

/**
 * Searches for all words with Levenshtein distance <= maxDist from the given word.
 *
 * @param{string} word - the word to search for
 * @param{number} maxDist - the maximum Levenshtein distance to return words for
 *
 * @returns{object} where key is a word from the Trie, and value is {node, dist}.
 */
Trie.prototype.search = function (word, maxDist) {
  var currentRow = [];
  for (var i = 0; i <= word.length; i++) {
    currentRow[i] = i;
  }

  var results = {};

  for (var letter in this) {
    if (this.hasOwnProperty(letter) && letter.length === 1) {
      this[letter]._searchRecursive(letter, word, currentRow, results, maxDist);
    }
  }

  return results;
};

module.exports = Trie;

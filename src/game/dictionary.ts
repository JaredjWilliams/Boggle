export type Trie = {
  children: Record<string, Trie>
  end: boolean
}

export type Dictionary = {
  words: Set<string>
  trie: Trie
}

function createNode(): Trie {
  return { children: Object.create(null) as Record<string, Trie>, end: false }
}

export function dictionaryFromText(text: string): Dictionary {
  const words = new Set<string>()
  const trie = createNode()

  for (const line of text.split('\n')) {
    const word = line.trim().toLowerCase()
    if (!/^[a-z]{3,}$/.test(word)) continue
    words.add(word)

    let node = trie
    for (const letter of word) {
      let child = node.children[letter]
      if (!child) {
        child = createNode()
        node.children[letter] = child
      }
      node = child
    }
    node.end = true
  }

  return { words, trie }
}

let loading: Promise<Dictionary> | null = null

export function loadDictionary(): Promise<Dictionary> {
  if (!loading) {
    loading = fetch('/dictionary.txt')
      .then((response) => {
        if (!response.ok) throw new Error('Could not load the word list.')
        return response.text()
      })
      .then(dictionaryFromText)
  }
  return loading
}

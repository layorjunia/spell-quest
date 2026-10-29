import AppKit
// Reads words from stdin (one per line); prints "word<TAB>ok" or "word<TAB>BAD<TAB>guess1,guess2".
let sc = NSSpellChecker.shared
sc.setLanguage("en_US")
while let line = readLine() {
    let w = line.trimmingCharacters(in: .whitespaces)
    if w.isEmpty { continue }
    let r = sc.checkSpelling(of: w, startingAt: 0, language: "en_US", wrap: false, inSpellDocumentWithTag: 0, wordCount: nil)
    if r.location == NSNotFound { print("\(w)\tok") }
    else {
        let g = sc.guesses(forWordRange: NSRange(location: 0, length: (w as NSString).length), in: w, language: "en_US", inSpellDocumentWithTag: 0) ?? []
        print("\(w)\tBAD\t\(g.prefix(3).joined(separator: ","))")
    }
}

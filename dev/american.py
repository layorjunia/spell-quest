"""American English only. Jacob, 2026-10-29: "make sure this is american, not
european spelling". The macOS en_US spellchecker ACCEPTS many British forms
(grey, centre, theatre, travelled, mould, learnt ...), so a dictionary pass is
not enough — this list is the guard. Used by dev/build_words.py and dev/audit.py
(which also scans the app's own text). SPELLING only, never vocabulary.
"""
import re

_SPELL = r"""
 \w*(colour|favour|neighbour|humour|honour|flavour|harbour|behaviour|labour|rumour|savour|vapour|odour|armour|glamour|endeavour|tumour|vigour|rigour|saviour)\w*
 |\w*(centre|theatre|metre|litre|fibre|calibre|sabre|spectre|lustre|sombre|meagre|manoeuvre|reconnoitre)s?\b
 |\w*(realis|recognis|organis|apologis|criticis|emphasis|memoris|summaris|sympathis|civilis|analys|paralys|catalys|criticis|authoris|capitalis|colonis|customis|finalis|harmonis|idealis|maximis|minimis|modernis|normalis|optimis|penalis|popularis|prioritis|specialis|standardis|symbolis|utilis|visualis)(e|ed|es|ing|er|ers|ation|ations)\b
 |defence|offence|licence|pretence|practise\w*
 |\w*(travell|cancell|labell|modell|levell|fuell|signall|counsell|marvell|quarrell|jewell|totall|channell|tunnell|panell|shovell|snorkell)(ed|ing|er|ers)\b
 |grey\w*|tyre\w*|kerb\w*|plough\w*|cosy|whilst|programme\w*|cheque\w*|jewellery|aluminium|mould\w*|storey\w*|ageing|sceptic\w*|pyjama\w*|draught\w*|artefact\w*
 |learnt|spelt|burnt|dreamt|spilt|leapt|smelt|amongst|judgement|acknowledgement|fulfil|enrol|enrolment|instalment|skilful|wilful|dialogue|catalogue|analogue|oestrogen|paediatric\w*|anaemi\w*|haemo\w*|foetus|encyclopaedia|mediaeval|gaol|doughnut|sulphur|aeroplane|manoeuvre
"""
SPELLING = re.compile(r'\b(' + _SPELL + r')\b', re.X | re.I)
# words that are fine in American English even though they look British-ish
OK = {'axe', 'autumn'}


def british_hits(text, vocab=False):
    """British SPELLINGS only. Words that are simply more common in Britain
    (torch, holiday, mum) are fine — Jacob, 2026-10-29: "I'm talking about
    spelling." The `vocab` argument is kept so callers need no change."""
    t = text.replace('[', '').replace(']', '')
    return [m.group(0) for m in SPELLING.finditer(t) if m.group(0).lower() not in OK]

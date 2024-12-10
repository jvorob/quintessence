
all: zq1.js zq.zip

run: zq1.js
	firefox index.html

#zq1.js_esc: zq1.js
#	@# escape \ to XXX42
#	@# escape ` and $
#	@# turn XXX42 back into \\ .
#	@# note: also have to double up dollar signs for makefile
#	sed <$< >$@ -E 's/\\/XXX42/g ; s/`/\\`/g ; s/\$$/\\$$/g; s/XXX42/\\\\/g '
#
#zq1_final.js: zq1.js_esc zq1.js
#	@# takes zq1: finds line matching #QUINE, replaces it with contents of zq1.js_esc
#	sed <zq1.js -e "/#QUINE/r $<" -e "/#QUINE/d" >$@

zq1.js : zq1_raw.js q_compile.py
	python3 q_compile.py $<  > $@

zq.zip: zq1.js index.html
	zip $@ $^


clean:
	rm -f zq1.js zq.zip
.PHONY: clean

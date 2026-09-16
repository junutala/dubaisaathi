# Screen designs

`screens/*.dc.html` are the Dubai Saathi screens, one file per screen, plus `Names.dc.html` for
the three pillar names. `canvas.json` lays them out.

They are **generated** by `generate-screens.sh` from the chrome, icons and tokens in
`generator/`. Change the generator, not the generated files:

```sh
bash design/generate-screens.sh
python3 design/check-screens.py
```

The screens are reviewed on the canvas published from these files. Numbering follows
`docs/field-ledger.md`: L and घर, घर.1–घर.4, then one digit per pillar.

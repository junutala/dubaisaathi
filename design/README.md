# Screen designs

`screens/*.dc.html` are the Dubai Saathi screen designs — one file per screen, plus
`Brand.dc.html` for the colour, type and component system. `canvas.json` lays them out.

They are **generated** by `generate-screens.py`, which holds the colour tokens, the icon set
and the shared CSS in one place. Change the generator, not the generated files:

```sh
python3 design/generate-screens.py
```

The screens are reviewed on a canvas published from these files. Screen 1 is onboarding and
the numbering follows the traveller's path through the app; the row notes on the canvas explain
the grouping.

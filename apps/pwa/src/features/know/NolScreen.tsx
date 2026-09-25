import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import type { StringKey } from '../../i18n/index.js';
import { currentFares, PASS_LENGTHS, type ZoneFare } from '../transport/index.js';

/**
 * 3.4 · जानना › सफ़र › Nol कार्ड — which card or ticket, and what each costs (decision 037).
 *
 * Every figure comes from the fares pack, the same one जाना prices journeys with, so this page and
 * the fare on a route can never disagree. The pack's figures were checked on 25 September against
 * the RTA's own board at BurJuman station. A figure the pack does not carry is left out, never
 * filled in from memory.
 */
export function NolScreen() {
  const { t } = useSettings();
  const fares = currentFares();
  const aed = (amount: number) => t('tips.nol.aed', { aed: amount });
  const passes = fares.passes;

  const tripRows: readonly (readonly [StringKey, ZoneFare])[] = [
    ['tips.nol.silver', fares.nol.silver],
    ['tips.nol.gold', fares.nol.gold],
    ['tips.nol.red', fares.nol.redTicket],
    ['tips.nol.redGold', fares.nol.redTicketGold],
  ];

  return (
    <>
      <ScreenHeader
        pillar="know"
        trail={t('tips.nol.title')}
        onBack={() => {
          navigate({ screen: 'know', tab: 'travel' });
        }}
      />
      <div className="flow">
        <p>{t('tips.nol.lead')}</p>

        <section className="stack-sm">
          <h2 className="tip-h">{t('tips.nol.whichTitle')}</h2>
          <div className="tip-card-static">
            <strong>{t('tips.nol.silver')}</strong>
            <span>{t('tips.nol.silverWhy')}</span>
          </div>
          <div className="tip-card-static">
            <strong>{t('tips.nol.gold')}</strong>
            <span>{t('tips.nol.goldWhy')}</span>
          </div>
          <div className="tip-card-static">
            <strong>{t('tips.nol.red')}</strong>
            <span>
              {fares.redTicketIssueAed === undefined
                ? t('tips.nol.redWhyNoFee')
                : t('tips.nol.redWhy', { aed: fares.redTicketIssueAed })}
            </span>
          </div>
        </section>

        <section className="stack-sm">
          <h2 className="tip-h">{t('tips.nol.tripTitle')}</h2>
          <ZoneTable rows={tripRows} aed={aed} />
          {fares.oneZoneWithinKm !== undefined && (
            <p className="muted small">{t('tips.nol.shortHop', { km: fares.oneZoneWithinKm })}</p>
          )}
        </section>

        {fares.dayTicket !== undefined && (
          <section className="stack-sm">
            <h2 className="tip-h">{t('tips.nol.dayTitle')}</h2>
            <p>
              {t('tips.nol.day', {
                regular: fares.dayTicket.regular,
                gold: fares.dayTicket.gold,
              })}
            </p>
          </section>
        )}

        {passes !== undefined && (
          <section className="stack-sm">
            <h2 className="tip-h">{t('tips.nol.passTitle')}</h2>
            <p className="muted small">{t('tips.nol.passWhy')}</p>
            <ZoneTable
              caption={t('tips.nol.silver')}
              rows={PASS_LENGTHS.map((length) => [
                `tips.nol.${length}` as StringKey,
                passes.regular[length],
              ])}
              aed={aed}
            />
            <ZoneTable
              caption={t('tips.nol.gold')}
              rows={PASS_LENGTHS.map((length) => [
                `tips.nol.${length}` as StringKey,
                passes.gold[length],
              ])}
              aed={aed}
            />
          </section>
        )}

        <section className="stack-sm">
          <h2 className="tip-h">{t('tips.nol.knowTitle')}</h2>
          <ul className="tip-list">
            {fares.childrenFree !== undefined && (
              <li>
                {t('tips.nol.children', {
                  years: fares.childrenFree.underYears,
                  cm: fares.childrenFree.underCm,
                })}
              </li>
            )}
            {fares.minimumBalanceAed !== undefined && (
              <li>{t('tips.nol.minimum', { aed: fares.minimumBalanceAed })}</li>
            )}
            <li>
              {t('tips.nol.rules', {
                minutes: fares.journeyRules.modeChangeMinutes,
                transfers: fares.journeyRules.maxTransfers,
                total: fares.journeyRules.maxJourneyMinutes,
              })}
            </li>
          </ul>
        </section>

        <p className="muted small">{t('tips.nol.source')}</p>
      </div>
    </>
  );
}

/** Rows by zones: one, two, three or more — the columns the RTA's own board uses. */
function ZoneTable({
  rows,
  aed,
  caption,
}: {
  readonly rows: readonly (readonly [StringKey, ZoneFare])[];
  readonly aed: (amount: number) => string;
  readonly caption?: string;
}) {
  const { t } = useSettings();
  return (
    <table className="zone-table">
      {caption !== undefined && <caption>{caption}</caption>}
      <thead>
        <tr>
          <th />
          <th>{t('tips.nol.zone1')}</th>
          <th>{t('tips.nol.zone2')}</th>
          <th>{t('tips.nol.zone3')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, fare]) => (
          <tr key={label}>
            <th>{t(label)}</th>
            <td>{aed(fare.oneZone)}</td>
            <td>{aed(fare.twoZones)}</td>
            <td>{aed(fare.moreZones)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

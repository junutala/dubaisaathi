import { useEffect } from 'react';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { recordUsage } from '../ask/index.js';
import { NolScreen } from './NolScreen.js';
import { textTopic } from './tips.js';

/**
 * 3.4 · one topic of जानना. The Nol card has its own page; every other topic is written as data and
 * shown here: its title, then each item with its name, how serious it is, and what to do.
 */
export function TopicScreen({ tipId }: { readonly tipId: string }) {
  const { t, locale } = useSettings();
  // For the owner's count of what travellers read; nothing is shown (the owner, 25 September).
  useEffect(() => {
    recordUsage('topic', tipId);
  }, [tipId]);
  if (tipId === 'nol') return <NolScreen />;
  const topic = textTopic(tipId);
  const back = () => {
    navigate({ screen: 'know', tab: topic?.tab ?? 'travel' });
  };
  if (topic === undefined) {
    return (
      <>
        <ScreenHeader pillar="know" onBack={back} />
        <div className="flow">
          <p className="trouble">{t('tips.gone')}</p>
        </div>
      </>
    );
  }
  return (
    <>
      <ScreenHeader pillar="know" trail={topic.title[locale]} onBack={back} />
      <div className="flow">
        <h1 className="tip-title">{topic.title[locale]}</h1>
        <ol className="tip-items">
          {topic.items.map((item) => (
            <li key={item.title.en} className="tip-item">
              <span className="tip-item-head">
                <strong>{item.title[locale]}</strong>
                <span className="tip-level">{item.level[locale]}</span>
              </span>
              <span>{item.body[locale]}</span>
            </li>
          ))}
        </ol>
        <p className="muted small">{topic.footer[locale]}</p>
      </div>
    </>
  );
}

import styles from "./player-compare-loading.module.css";

export default function PlayerCompareLoadingShell() {
  return (
    <main className={styles.page} aria-busy="true">
      <header className={styles.topbar}>
        <span className={styles.back}>‹</span>
        <div><strong>147数据局</strong><small>PLAYER COMPARE</small></div>
        <span />
      </header>
      <section className={styles.hero}>
        <small>PLAYER COMPARE</small>
        <h1>球员对比</h1>
        <div className={styles.players}>
          <div className={styles.player}><div className={styles.avatar} /><div className={styles.line} /><div className={`${styles.line} ${styles.lineShort}`} /></div>
          <div className={styles.vs}>VS</div>
          <div className={styles.player}><div className={styles.avatar} /><div className={styles.line} /><div className={`${styles.line} ${styles.lineShort}`} /></div>
        </div>
      </section>
      <div className={styles.body}><div className={styles.card} /><div className={styles.card} /><div className={styles.card} /></div>
    </main>
  );
}

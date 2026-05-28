/* ─────────────────────────────────────────────────────────
   Metodoloji module v1 — Statik içerik
   
   Yayın için kritik sayfa. Şunları içerir:
   - Bu site nedir?
   - Veri kaynakları
   - Hesaplama yöntemi
   - Tarafsızlık ilkeleri
   - Sınırlamalar / önemli notlar
   - Atıf biçimi
   - Açık kaynak ve bağımsızlık beyanı
   ───────────────────────────────────────────────────────── */

(function() {
  'use strict';

  window.Modules.metodoloji = function(container) {
    container.innerHTML = `
      <header class="page-header">
        <span class="eyebrow">Bölüm · i · Şeffaflık ve hesap verebilirlik</span>
        <h1>Metodoloji</h1>
        <p class="lede">
          Bu sayfada sitenin <strong>nasıl çalıştığını</strong>, hangi <strong>kaynakları kullandığını</strong>,
          <strong>hangi seçimleri yaptığını</strong> ve <strong>nelerin dışında tutulduğunu</strong>
          açıklarız. Şeffaflık bu projenin temelidir.
          İlk ziyaret için <a href="#/baslangic">Başlangıç rehberi</a>.
        </p>
      </header>

      <div class="prose">

      <nav class="metod-icindekiler">
        <div class="metod-icindekiler-baslik">İçindekiler</div>
        <ol>
          <li><a href="#nedir">Bu site nedir?</a></li>
          <li><a href="#anket-firmalari">Anket firmaları modülü</a></li>
          <li><a href="#kaynaklar">Veri kaynakları</a></li>
          <li><a href="#hesaplama">Hesaplama yöntemi</a></li>
          <li><a href="#tarafsizlik">Tarafsızlık ilkeleri</a></li>
          <li><a href="#sinirlar">Sınırlamalar ve önemli notlar</a></li>
          <li><a href="#arastirmaci">Araştırmacı ve gazeteci kaynakları</a></li>
          <li><a href="#atif">Atıf ve kullanım</a></li>
          <li><a href="#bagimsizlik">Açık kaynak ve bağımsızlık</a></li>
          <li><a href="#iletisim">İletişim ve hata bildirimi</a></li>
        </ol>
      </nav>

      <!-- ═══ 1. BU SİTE NEDİR ═══ -->
      <section id="nedir" class="metod-bolum">
        <h2>Bu site nedir?</h2>
        <p>
          <strong>Türkiye Seçim Arşivi</strong>, 2018-2024 yılları arasında Türkiye'de yapılan
          <strong>13 farklı seçimin</strong> il ve ilçe bazında sonuçlarını, demografik verilerle birlikte
          tek bir arayüzde inceleme imkânı sunan <strong>bağımsız, açık kaynak</strong> bir platformdur.
        </p>
        <p>
          Bu site:
        </p>
        <ul>
          <li><strong>YSK</strong> (Yüksek Seçim Kurulu) ve <strong>TÜİK</strong> (Türkiye İstatistik Kurumu) tarafından
              kamuya açık biçimde yayımlanan verileri kullanır.</li>
          <li><strong>Herhangi bir siyasi parti, dernek, vakıf veya iş çevresine bağlı değildir</strong>.</li>
          <li>Reklam göstermez. <strong>Gönüllü emekle</strong> hazırlanır.</li>
          <li><strong>Suçlayıcı yargı taşımaz.</strong> Verideki dikkat çekici desenler için
              "<em>uyumsuzluk</em>", "<em>sorgulamaya açar</em>" gibi terimler kullanır.</li>
          <li>Geleceğe dönük <strong>seçim öngörüsü yapmaz</strong>, kişi değerlendirmesi içermez.</li>
        </ul>
        <p>
          Tüm veri ve hesaplamalar şeffaftır. Üretim scriptleri açık kaynaktır ve
          <a href="#bagimsizlik">aşağıda</a> belirtildiği üzere indirilip yeniden çalıştırılabilir.
        </p>
      </section>

      <!-- ═══ ANKET FİRMALARI ═══ -->
      <section id="anket-firmalari" class="metod-bolum">
        <h2>Anket firmaları modülü</h2>
        <p>
          <a href="#/anket">Anket firmaları</a> bölümü, kamuoyu araştırma şirketlerinin seçim öncesi
          tahminlerini resmi YSK sonuçlarıyla yan yana koyar. Her firma için seçime en yakın anket
          esas alınır; ortalama sapmaya göre 0–100 arası isabet puanı hesaplanır.
        </p>
        <ul>
          <li>Geçmiş seçimler (2018–2024): karşılaştırma, paylaşımlar ve puan tablosu.</li>
          <li>Her tahminin televizyon, YouTube, haber veya sosyal medya kaynağı linklenir.</li>
          <li>Gelecek seçimler: yalnızca doğrulanmış tahminler listelenir; <strong>puan verilmez</strong>.</li>
        </ul>
        <p>
          Bu modül bir propaganda aracı değildir; yalnızca kayıtlı tahmin ile resmi sonuç arasındaki
          farkı gösterir. Detaylı açıklama için modül içindeki <a href="#/anket/mode/about">Hakkında</a> sekmesine bakın.
        </p>
      </section>

      <!-- ═══ 2. VERİ KAYNAKLARI ═══ -->
      <section id="kaynaklar" class="metod-bolum">
        <h2>Veri kaynakları</h2>

        <h3>Seçim sonuçları — YSK</h3>
        <p>
          Sandık, oy, parti ve katılım verileri <a href="https://www.ysk.gov.tr" target="_blank" rel="noopener">Yüksek Seçim Kurulu</a>'nun
          resmi raporlarından alınmıştır. Aşağıdaki 13 seçim arşivde yer alır:
        </p>
        <ul class="metod-secim-listesi">
          <li><strong>2018:</strong> Cumhurbaşkanlığı (24 Haziran), Milletvekili Genel Seçimleri (24 Haziran)</li>
          <li><strong>2019:</strong> Büyükşehir Belediye Başkanlığı, Belediye Başkanlığı,
              İl Genel Meclisi, Belediye Meclisi (31 Mart)</li>
          <li><strong>2023:</strong> Cumhurbaşkanlığı 1. Tur (14 Mayıs), Cumhurbaşkanlığı 2. Tur (28 Mayıs),
              Milletvekili Genel Seçimleri (14 Mayıs)</li>
          <li><strong>2024:</strong> Büyükşehir Belediye Başkanlığı, Belediye Başkanlığı,
              İl Genel Meclisi, Belediye Meclisi (31 Mart)</li>
        </ul>

        <h3>Demografi — TÜİK ADNKS</h3>
        <p>
          Yaş, cinsiyet ve eğitim verileri <a href="https://www.tuik.gov.tr" target="_blank" rel="noopener">TÜİK</a>'in
          <strong>Adrese Dayalı Nüfus Kayıt Sistemi (ADNKS)</strong>'nden alınmıştır.
          Veri kapsamı:
        </p>
        <ul>
          <li><strong>Yıllar:</strong> 2018, 2019, 2020, 2021, 2022, 2023, 2024 (7 yıl)</li>
          <li><strong>Yaş kategorileri:</strong> 18-24, 25-34, 35-44, 45-54, 55-64, 65+ (sadece yetişkin nüfus)</li>
          <li><strong>Eğitim kategorileri:</strong> Okur-yazar değil, okur-yazar (mezun değil),
              ilkokul/ortaokul, lise/dengi, üniversite ve üstü, bilinmeyen</li>
          <li><strong>Cinsiyet:</strong> Erkek, kadın</li>
          <li><strong>Coğrafi kapsam:</strong> 81 il, 973 ilçe</li>
        </ul>

        <h3>Coğrafi sınırlar</h3>
        <p>
          İl ve ilçe sınırları için <a href="https://www.tuik.gov.tr" target="_blank" rel="noopener">TÜİK</a> ve
          <a href="https://www.harita.gov.tr" target="_blank" rel="noopener">Harita Genel Müdürlüğü</a>
          tarafından yayımlanan idari sınır verileri kullanılmıştır.
          NUTS-1 (12 bölge) ve NUTS-2 (26 alt bölge) gruplandırması
          <strong>Avrupa Birliği İstatistiki Bölge Birimleri Sınıflaması</strong>'na uygundur.
        </p>
      </section>

      <!-- ═══ 3. HESAPLAMA YÖNTEMİ ═══ -->
      <section id="hesaplama" class="metod-bolum">
        <h2>Hesaplama yöntemi</h2>

        <h3>Aggregate (özet) üretimi</h3>
        <p>
          Ham YSK ve TÜİK verileri Python scriptleri ile <strong>aggregate (özet)</strong> dosyalarına dönüştürülür.
          Bu işlem her seçim ve her yıl için tekrarlanır; sonuçlar JSON formatında saklanır.
          Tüm scriptler açık kaynaktır ve aynı çıktıyı üretmek için yeniden çalıştırılabilir.
        </p>

        <h3>Parti adı normalizasyonu</h3>
        <p>
          Aynı politik akımın <strong>farklı seçim dönemlerinde farklı yasal isimlerle</strong> seçime girebildiği
          durumlarda, trend analizinde tutarlı bir çizgi sunmak için aşağıdaki birleştirmeler yapılır:
        </p>
        <ul>
          <li><strong>HDP / YSP (Yeşil Sol Parti) / DEM Parti</strong> → "DEM/HDP" (aynı politik akım,
              yasal süreçler nedeniyle farklı isimlerle seçime girdi)</li>
          <li><strong>AKP / AK Parti</strong> → "AK PARTİ" (yazım varyantı)</li>
          <li><strong>SAADET PARTİSİ</strong> → "SAADET" (kısa ad)</li>
        </ul>
        <p>
          Cumhurbaşkanlığı seçimlerinde adaylar isimleriyle anılır ve
          <strong>"(CB)"</strong> notu ile parti adlarından ayrılır (örn. "Erdoğan (CB)", "Kılıçdaroğlu (CB)").
        </p>

        <h3>Koalisyon (ittifak) tanımları</h3>
        <p>
          İttifak yapısı her seçim için farklı olabildiğinden, <strong>her seçim için ayrı</strong> tanımlanır:
        </p>
        <div class="metod-tablo-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>İttifak</th>
                <th>2018</th>
                <th>2023</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Cumhur</strong></td>
                <td>AK PARTİ, MHP, BBP</td>
                <td>AK PARTİ, MHP, BBP, YENİDEN REFAH, HÜDA PAR</td>
              </tr>
              <tr>
                <td><strong>Millet</strong></td>
                <td>CHP, İYİ PARTİ, SAADET, DP</td>
                <td>CHP, İYİ PARTİ, SAADET, DP, DEVA, GELECEK</td>
              </tr>
              <tr>
                <td><strong>Emek ve Özgürlük</strong></td>
                <td>HDP (bağımsız)</td>
                <td>DEM/HDP, TİP, EMEP, SOL PARTİ, TKP, TKH</td>
              </tr>
              <tr>
                <td><strong>ATA</strong></td>
                <td>—</td>
                <td>ZAFER PARTİSİ, ADALET, ÜLKEM</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Uyumsuzluk eşikleri</h3>
        <p>
          Uyumsuzluk tespiti modülünde aşağıdaki eşikler kullanılır:
        </p>
        <ul>
          <li><strong>Sekme A — Demografik uyumsuzluk:</strong> Sandık seçmeni / TÜİK 18+ nüfus oranı.
              %85'in altı veya %115'in üstü dikkat çekicidir.</li>
          <li><strong>Sekme B — Zamansal değişim:</strong> İki ardışık seçim arası seçmen değişimi.
              +%20/40 (artış) veya -%10/30 (azalma) eşikleri.</li>
          <li><strong>Sekme C — Tip tutarsızlığı:</strong> Yerel seçimde (BB/IGM) kapsam oranı.
              %50 altı kapsam dikkat çekicidir.</li>
        </ul>
        <p>
          Bu eşikler <strong>"şu kadar üzerinde kesin bir uygunsuzluk vardır"</strong> anlamına gelmez.
          Sadece <strong>standart bir referansa göre uzaklığı</strong> gösterir. Nedenleri arasında
          göç, demografik değişim, doğal afet, idari sınır değişikliği, veri tarihi farkı gibi
          pek çok meşru sebep olabilir.
        </p>

        <h3>Demografi hesaplamaları</h3>
        <ul>
          <li><strong>Ortalama yaş:</strong> Her yaş kategorisinin orta noktası (örn. 25-34 için 29.5)
              ile ağırlıklı ortalama. Kategorilerden türetilmiş yaklaşık bir değerdir.</li>
          <li><strong>Yaş × eğitim çaprazı:</strong> Ham TÜİK verisinden doğrudan kuşak-eğitim
              kombinasyonu çıkarılır. Türkiye geneli ve 81 il için ayrı tutulur.</li>
          <li><strong>Yığılmış bar grafikler:</strong> Yüzdeler her satır için kendi içinde
              %100'e tamamlanır. Toplam %100'ün altında görünen kategoriler
              "%0.3 altı dilim çizilmez" kuralı nedeniyledir.</li>
        </ul>
      </section>

      <!-- ═══ 4. TARAFSIZLIK ═══ -->
      <section id="tarafsizlik" class="metod-bolum">
        <h2>Tarafsızlık ilkeleri</h2>
        <p>
          Bu projenin <strong>en önemli kuralı</strong> tarafsızlıktır. Aşağıdaki ilkeler tüm modüllerde
          uygulanır:
        </p>

        <h3>1. Tarafsız dil ve terim seçimi</h3>
        <p>
          Veride dikkat çekici sapmalar için yargılayıcı veya suçlayıcı bir dil
          <strong>kullanılmaz</strong>. Bunun yerine tarafsız terimler tercih edilir:
        </p>
        <ul>
          <li>"<em>Uyumsuzluk</em>" — TÜİK ve YSK verileri arasında beklenen örüntüden sapma</li>
          <li>"<em>Sorgulamaya açar</em>" — Daha detaylı incelemeyi gerektiren durum</li>
          <li>"<em>Dikkat çekici</em>" — İstatistiksel olarak yaygın olmayan durum</li>
        </ul>

        <h3>2. Alternatif açıklamalar her zaman sunulur</h3>
        <p>
          Bir bölgede beklenmedik bir veri görüldüğünde, <strong>otomatik olarak</strong>
          alternatif açıklamalar listelenir:
        </p>
        <ul>
          <li>İç göç (mevsimsel/kalıcı)</li>
          <li>Doğal afet (deprem, yangın, sel sonrası nüfus hareketi)</li>
          <li>İdari sınır değişikliği (büyükşehir kanunu, ilçe ayrılması/birleşmesi)</li>
          <li>Demografik özelliklere bağlı doğal sapma</li>
          <li>Veri tarih farkı (TÜİK Aralık, YSK seçim günü)</li>
        </ul>

        <h3>3. Geleceğe dönük öngörü yok</h3>
        <p>
          <strong>2028 ve sonrası seçimlere yönelik öngörü yapılmaz.</strong> Kişi değerlendirmesi
          içermez. "X parti şu sebeple kazanır/kaybeder" türünde yargılar bulunmaz.
          Sadece <strong>geçmiş verinin</strong> incelenmesi sunulur.
        </p>

        <h3>4. Belirli parti veya kişiye odaklanmaz</h3>
        <p>
          Modüller belirli bir partiyi ön plana çıkaracak veya geriye atacak şekilde tasarlanmamıştır.
          Tüm partiler aynı yöntemle gösterilir. Hangi partinin önemli/yüksek olduğu kararı
          tamamen verinin kendisi tarafından alınır (örn. eşik %1, %2 gibi otomatik kurallarla).
        </p>

        <h3>5. Görsel olarak eşit muamele</h3>
        <p>
          Renkler, sıralamalar ve etiketler herhangi bir partiyi olumlu/olumsuz çağrıştıracak şekilde
          seçilmemiştir. Geleneksel parti renkleri (AKP turuncu, CHP kırmızı, MHP koyu kırmızı, vb.)
          kullanılır.
        </p>
      </section>

      <!-- ═══ 5. SINIRLAMALAR ═══ -->
      <section id="sinirlar" class="metod-bolum">
        <h2>Sınırlamalar ve önemli notlar</h2>
        <p>
          Bu site insanın elinden çıkmıştır ve bazı yapısal sınırlamalar taşır. Onları açıkça beyan ederiz:
        </p>

        <h3>18-24 yaş eğitim verisi yanıltıcı olabilir</h3>
        <div class="metod-uyari">
          <strong>Dikkat:</strong> 18-24 yaş grubunun büyük kısmı <em>hâlâ eğitim sürecinde</em>dir.
          TÜİK verisinde kişiler <strong>tamamladığı en son eğitim seviyesine göre</strong> sayılır.
          Üniversite öğrencileri henüz mezun olmadığı için <strong>"Lise/dengi" kategorisinde</strong> görünür.
          Bu yüzden bu yaş grubunda lise oranı yüksek, üniversite oranı düşük çıkar —
          bu bir veri tanım özelliğidir, gerçek eğitim açığı değildir.
        </div>

        <h3>BB ve BM seçimleri sadece belediye sınırını kapsar</h3>
        <div class="metod-uyari">
          Belediye Başkanlığı (BB) ve Belediye Meclisi (BM) seçimleri <strong>sadece belediye
          sınırları içindeki seçmeni</strong> kapsar. Bu seçimlerde kayıtlı seçmen sayısı,
          ilçenin TÜİK 18+ nüfusundan <strong>çok düşük olabilir</strong>
          (örn. bir köyün çoğunluğunun belediye sınırı dışında kalması).
          Bu nedenle <strong>BB ve BM seçimleri demografik uyumsuzluk analizine dahil edilmez</strong>;
          sadece İGM, BBB, CB, MV seçimleri kullanılır.
        </div>

        <h3>2023 CB1'de aday isimleri</h3>
        <div class="metod-uyari">
          2023 Cumhurbaşkanlığı 1. Tur seçiminde adaylar (Erdoğan, Kılıçdaroğlu, Oğan, İnce)
          <strong>partiyle değil isimleriyle</strong> YSK verisinde geçer. Modüllerde bu isimler
          "X (CB)" şeklinde gösterilir ve <strong>destekledikleri ittifaka göre</strong>
          (Cumhur, Millet vb.) koalisyon hesabına eklenir.
        </div>

        <h3>Anonim kullanım istatistiği</h3>
        <div class="metod-uyari">
          Site, hangi modüllerin kaç kez açıldığını ve paylaşım butonlarının kullanımını
          <strong>anonim olarak</strong> ölçebilir (kişisel veri veya çerez tabanlı profilleme yok).
          Amaç yalnızca arşivin hangi bölümlerinin okuyucuya ulaştığını anlamaktır.
        </div>

        <h3>YSK ve TÜİK tarihleri farklı olabilir</h3>
        <div class="metod-uyari">
          TÜİK ADNKS verisi her yıl <strong>Aralık 31</strong> itibarıyla yayımlanır.
          YSK seçim verisi ise <strong>seçim günü</strong>ne aittir (Mayıs, Haziran veya Mart).
          Bu nedenle aynı yılın seçimi ve demografisi arasında <strong>3-6 ay arası fark</strong>
          olabilir; özellikle nüfusu hızlı değişen bölgelerde (yeni inşa alanları, depremzedeler
          gibi) bu fark anlamlı sapmalara yol açabilir.
        </div>

        <h3>İlçe adı normalize edilmiştir</h3>
        <p>
          YSK ve TÜİK verilerinde aynı ilçe farklı yazımla geçebilir (büyük/küçük harf,
          birleşik/ayrı yazım, Türkçe karakter kullanımı). Tüm ilçeler <strong>kanonik bir isim
          haritası</strong> kullanılarak eşleştirilmiştir. Bu nedenle iki kaynak arasında doğrudan
          yapılacak karşılaştırmalar <strong>her zaman birebir uyumlu olmayabilir</strong>.
        </p>

        <h3>Düzenli güncelleme yapılmaz</h3>
        <p>
          Bu site bir <strong>arşiv</strong>dir; canlı veri akışı yoktur. Yeni seçimler veya
          ADNKS güncellemeleri eklendiğinde manuel olarak güncellenir. Mevcut veri sürümü
          <strong>2024 yerel seçimi</strong>nin resmi sonuçları ve <strong>2024 ADNKS</strong>
          verisini kapsar.
        </p>
      </section>

      <!-- ═══ ARAŞTIRMACI / GAZETECİ ═══ -->
      <section id="arastirmaci" class="metod-bolum">
        <h2>Araştırmacı ve gazeteci kaynakları</h2>
        <p>
          Akademik atıf, haber görseli ve veri indirme için hazır belgeler:
        </p>
        <div class="metod-kaynak-grid">
          <a class="metod-kaynak-kart" href="docs/codebook.html" target="_blank" rel="noopener">
            <div class="metod-kaynak-etiket">Veri sözlüğü</div>
            <div class="metod-kaynak-baslik">Codebook</div>
            <p>Dosya yapısı, değişkenler, parti birleştirmeleri, sınırlar.</p>
          </a>
          <a class="metod-kaynak-kart" href="promo/basin-ozeti.html" target="_blank" rel="noopener">
            <div class="metod-kaynak-etiket">1 sayfa</div>
            <div class="metod-kaynak-baslik">Basın özeti</div>
            <p>Kapsam, kaynaklar, alıntı biçimi, örnek haber açıları. Yazdırılabilir.</p>
          </a>
          <a class="metod-kaynak-kart" href="https://github.com/Falpertan/secim-arsiv/tree/main/data" target="_blank" rel="noopener">
            <div class="metod-kaynak-etiket">GitHub</div>
            <div class="metod-kaynak-baslik">Veri indir</div>
            <p><span class="mono">data/</span> klasöründeki tüm JSON dosyaları. CC BY-NC 4.0.</p>
          </a>
        </div>
        <p class="metod-not" style="margin-top: var(--space-4);">
          <strong>Grafik dışa aktarma:</strong> Trend modülü → Parti zaman çizelgesi sekmesinde
          grafik üstünde <em>PNG indir</em> butonu (kaynak satırı otomatik eklenir).<br>
          <strong>Tablo dışa aktarma:</strong> Trend, Karşılaştırma ve Arşiv modüllerinde
          <em>CSV indir</em> — Excel / LibreOffice ile açılır (; ayraç, UTF-8).
        </p>
      </section>

      <!-- ═══ 6. ATIF ═══ -->
      <section id="atif" class="metod-bolum">
        <h2>Atıf ve kullanım</h2>
        <p>
          Bu siteden elde edilen veri veya görseller, <strong>kaynak belirtilerek</strong>
          ticari olmayan amaçlarla kullanılabilir. Önerilen atıf biçimi:
        </p>
        <div class="metod-atif">
          <code>Türkiye Seçim Arşivi (AlperTan™), [erişim tarihi]. URL: [siteden alınan sayfa]</code>
        </div>
        <p>
          Akademik atıf için (TR Dizin/APA biçimi):
        </p>
        <div class="metod-atif">
          <code>AlperTan. (2026). Türkiye Seçim Arşivi: 2018-2024 seçim ve demografi veri seti.
                Erişim tarihi: [tarih]. [URL]</code>
        </div>
        <p>
          <strong>Ticari kullanım, doğrudan içerik çoğaltma veya API tarzı toplu veri çekme</strong>
          için lütfen önce iletişime geçin. Ham veri dosyaları
          <span class="mono">data/aggregates/</span> klasöründe açık biçimde bulunur ve kişisel/araştırma
          amaçlı kullanım için serbesttir.
        </p>
        <p class="metod-not">
          <strong>Lisans:</strong> Veri ve görseller <em>Creative Commons Attribution-NonCommercial 4.0
          International (CC BY-NC 4.0)</em> lisansı altında sunulur. Yazılım kodu ayrı bir
          (henüz belirlenmemiş) açık kaynak lisansla yayımlanacaktır.
        </p>
      </section>

      <!-- ═══ 7. AÇIK KAYNAK ═══ -->
      <section id="bagimsizlik" class="metod-bolum">
        <h2>Açık kaynak ve bağımsızlık</h2>

        <h3>Bağımsızlık beyanı</h3>
        <p>
          <strong>Türkiye Seçim Arşivi, herhangi bir siyasi partiyle, dernekle, vakıfla,
          medya kuruluşuyla veya iş çevresiyle bağlantılı değildir.</strong>
          Tasarımı, kodu, içeriği ve sunumu tek bir kişi (<strong>AlperTan</strong>) tarafından
          gönüllü olarak hazırlanmıştır.
        </p>
        <p>
          Site <strong>gönüllü emekle</strong> hazırlanır. Reklam yoktur;
          arka planda izleme/takip yapılmaz. Çerez kullanılmaz.
        </p>

        <h3>Açık kaynak</h3>
        <p>
          Tüm site kodu ve veri üretim scriptleri <strong>açık kaynak</strong> olarak yayımlanacaktır.
          Kaynak kod adresi site yayına alındığında bu bölümde yer alacaktır.
        </p>
        <p>
          Kullanıcılar dilerlerse <strong>tüm hesaplamaları kendi bilgisayarlarında</strong>
          yeniden üretebilir, kontrol edebilir ve hata bildirebilir.
        </p>

        <h3>Marka</h3>
        <p>
          <strong>AlperTan™</strong> markası bu projenin yaratıcısına aittir.
          Yazım kuralı: sadece <strong>A</strong> ve <strong>T</strong> büyük harf
          (AlperTan); tüm büyük harf yazımı (ALPERTAN) marka tarafından kullanılmaz.
        </p>
      </section>

      <!-- ═══ 8. İLETİŞİM ═══ -->
      <section id="iletisim" class="metod-bolum">
        <h2>İletişim ve hata bildirimi</h2>
        <p>
          Veri hatası, hesaplama yanlışı, ifade önerisi, akademik işbirliği veya basın talepleri için:
        </p>
        <div class="metod-iletisim">
          <div class="metod-iletisim-satir">
            <span class="metod-iletisim-etiket">Marka</span>
            <span class="metod-iletisim-deger"><strong>AlperTan</strong></span>
          </div>
          <div class="metod-iletisim-satir">
            <span class="metod-iletisim-etiket">E-posta</span>
            <span class="metod-iletisim-deger"><a href="mailto:secimarsivi@gmail.com">secimarsivi@gmail.com</a></span>
          </div>
          <div class="metod-iletisim-satir">
            <span class="metod-iletisim-etiket">İletişim sayfası</span>
            <span class="metod-iletisim-deger"><a href="#/iletisim">#/iletisim</a></span>
          </div>
          <div class="metod-iletisim-satir">
            <span class="metod-iletisim-etiket">Veri sürümü</span>
            <span class="metod-iletisim-deger mono">v1.0 — 2024 yerel seçimi + 2024 ADNKS</span>
          </div>
        </div>
        <p class="metod-not" style="margin-top: var(--space-4);">
          Bu sayfa son güncellenme: <em>Mayıs 2026</em>. Metodoloji güncellemeleri burada duyurulur.
        </p>
      </section>

      </div>

      ${renderStiller()}
    `;

    // Smooth scroll için linklere event ekle
    container.querySelectorAll('.metod-icindekiler a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const id = link.getAttribute('href').slice(1);
        const target = container.querySelector('#' + id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  };

  function renderStiller() {
    return `
      <style>
        /* İçindekiler kutusu */
        .metod-icindekiler {
          background: #fdfaf2;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: var(--space-4) var(--space-5);
          margin-bottom: var(--space-7);
        }
        .metod-icindekiler-baslik {
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: var(--ink-3);
          text-transform: none;
          margin-bottom: var(--space-3);
        }
        .metod-icindekiler ol {
          margin: 0;
          padding-left: var(--space-5);
          counter-reset: item;
          list-style: none;
        }
        .metod-icindekiler li {
          counter-increment: item;
          padding: 4px 0;
          font-size: 14px;
        }
        .metod-icindekiler li::before {
          content: counter(item) ". ";
          font-family: var(--font-mono);
          color: var(--brand-gold);
          font-weight: 600;
          margin-right: 4px;
        }
        .metod-icindekiler a {
          color: var(--ink-2);
          text-decoration: none;
          border-bottom: 1px dotted transparent;
          transition: border-color 100ms ease, color 100ms ease;
        }
        .metod-icindekiler a:hover {
          color: var(--brand-gold);
          border-bottom-color: var(--brand-gold);
        }

        /* Bölümler */
        .metod-bolum {
          margin-bottom: var(--space-7);
          padding-top: var(--space-3);
        }
        .metod-bolum h2 {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 500;
          color: var(--ink);
          margin: 0 0 var(--space-4) 0;
          padding-bottom: var(--space-3);
          border-bottom: 1px solid var(--line);
          letter-spacing: -0.02em;
        }
        .metod-bolum h3 {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 600;
          color: var(--ink);
          margin: var(--space-5) 0 var(--space-3) 0;
          letter-spacing: -0.01em;
        }
        .metod-bolum p {
          font-size: 14.5px;
          line-height: 1.75;
          color: var(--ink-2);
          margin: 0 0 var(--space-3) 0;
        }
        .metod-bolum ul, .metod-bolum ol {
          font-size: 14.5px;
          line-height: 1.75;
          color: var(--ink-2);
          margin: 0 0 var(--space-4) 0;
          padding-left: var(--space-5);
        }
        .metod-bolum li {
          margin-bottom: 6px;
        }
        .metod-bolum a {
          color: var(--brand-gold);
          text-decoration: none;
          border-bottom: 1px dotted var(--brand-gold);
        }
        .metod-bolum a:hover {
          border-bottom-style: solid;
        }
        .metod-bolum strong {
          color: var(--ink);
        }

        /* Seçim listesi */
        .metod-secim-listesi li {
          margin-bottom: var(--space-2);
        }
        .metod-not {
          font-size: 12.5px;
          color: var(--ink-3);
          font-style: italic;
        }

        /* Uyarı kutusu */
        .metod-uyari {
          margin: var(--space-3) 0 var(--space-4) 0;
          padding: var(--space-3) var(--space-4);
          background: rgba(200, 134, 26, 0.06);
          border-left: 3px solid var(--signal-amber);
          border-radius: 0 3px 3px 0;
          font-size: 13.5px;
          line-height: 1.65;
          color: var(--ink-2);
        }
        .metod-uyari strong {
          color: var(--ink);
        }

        /* Tablo wrapper */
        .metod-tablo-wrap {
          margin: var(--space-3) 0 var(--space-4) 0;
          overflow-x: auto;
        }

        /* Atıf kutuları (code-style) */
        .metod-atif {
          background: #fdfaf2;
          border: 1px solid var(--line);
          border-left: 3px solid var(--brand-gold);
          border-radius: 0 3px 3px 0;
          padding: var(--space-3) var(--space-4);
          margin: var(--space-3) 0 var(--space-4) 0;
        }
        .metod-atif code {
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--ink);
          background: none;
          padding: 0;
          line-height: 1.7;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        /* İletişim kutusu */
        .metod-iletisim {
          background: #fdfaf2;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: var(--space-4) var(--space-5);
          margin: var(--space-3) 0;
        }
        .metod-iletisim-satir {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: var(--space-3);
          padding: var(--space-2) 0;
          border-bottom: 1px solid var(--line-soft);
          font-size: 13.5px;
        }
        .metod-iletisim-satir:last-child {
          border-bottom: none;
        }
        .metod-iletisim-etiket {
          font-weight: 600;
          color: var(--ink-3);
          letter-spacing: 0.05em;
          font-size: 11.5px;
          text-transform: none;
          padding-top: 2px;
        }
        .metod-iletisim-deger {
          color: var(--ink-2);
        }

        /* Mono span */
        .mono {
          font-family: var(--font-mono);
          font-size: 0.92em;
          color: var(--ink);
        }

        .metod-kaynak-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-4);
          margin: var(--space-4) 0;
        }
        .metod-kaynak-kart {
          display: block;
          background: #fdfaf2;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: var(--space-4) var(--space-5);
          text-decoration: none;
          color: inherit;
          transition: border-color 0.15s;
        }
        .metod-kaynak-kart:hover {
          border-color: var(--brand-gold);
        }
        .metod-kaynak-etiket {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: var(--brand-gold);
          margin-bottom: 6px;
        }
        .metod-kaynak-baslik {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 600;
          color: var(--ink);
          margin-bottom: 8px;
        }
        .metod-kaynak-kart p {
          font-size: 13px;
          line-height: 1.5;
          margin: 0;
          color: var(--ink-3);
        }
      </style>
    `;
  }
})();

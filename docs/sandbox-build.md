# LinuxでSandbox環境を組み立てる

Sandbox は1つのコマンドで完成する機能ではない。起動するプログラムに対し、別の名前空間、ファイルシステムの見え方、利用できるネットワーク、資源上限、許可する system call を順番に与えて組み立てる。このページでは Linux を対象に、各操作の直後に何が作られるかを確認する。

!!! tip "補足: Sandboxは部品の組み合わせ"

    名前空間は「見える世界」を分け、cgroup は「使える量」を上限化し、seccomp は「頼める操作」を絞る。1つでも省くと、その部分は隔離されない。Dockerなどの実行基盤は、これらの組み立てを自動化している。

> 注意: ここで扱う `mount`、network namespace、cgroup はホストの状態を変更し得る。作業用VMまたは使い捨てのLinux環境で試す。root権限が必要な手順を、普段使いのホストへそのまま実行しない。

## 完成までの順序

```mermaid
flowchart LR
  A[起動するプログラム] --> B[user namespace<br/>UID/GIDを対応付ける]
  B --> C[mount namespace<br/>rootfsとmountを分ける]
  C --> D[PID namespace<br/>子プロセスをPID 1にする]
  D --> E[network namespace<br/>NICと経路を分ける]
  E --> F[cgroup<br/>CPU・メモリ・PID数を上限化]
  F --> G[seccomp / LSM<br/>system callと権限を絞る]
  G --> H[隔離されたプロセス]
```

図の各箱は別の問題を解く。例えば network namespace を作っても、cgroup は作られない。実行基盤はこれらを組み合わせ、最後に対象プログラムを起動する。

## 0. 何を作るのかを先に観測する

Linux では、現在のプロセスが所属する名前空間は `/proc` から参照できる。

```bash
printf 'PID: '; readlink /proc/$$/ns/pid
printf 'mount: '; readlink /proc/$$/ns/mnt
printf 'network: '; readlink /proc/$$/ns/net
printf 'user: '; readlink /proc/$$/ns/user
```

出力例の `pid:[4026531836]` の数値は名前空間を識別する inode 番号である。後の `unshare` 内で同じコマンドを実行し、少なくとも新しく作った種類の番号が変化していることを確認する。

!!! tip "補足: 番号は権限の強さではない"

    この番号は「どの名前空間に所属しているか」を区別するラベルである。大きい番号ほど安全、という意味ではない。同じ番号なら同じ種類の名前空間を共有している。

## 1. 最小の隔離プロセスを起動する

次のコマンドは、user・mount・PID・network namespace を作り、その中で `bash` を起動する。`--map-root-user` は、呼び出した一般ユーザーを新しい user namespace の UID/GID 0 に対応付ける。これはホストの root を得る操作ではない。

```bash
unshare \
  --user --map-root-user \
  --mount \
  --pid --fork --mount-proc \
  --net \
  bash --noprofile --norc
```

!!! tip "補足: `unshare` は新しい部屋を作ってから子プロセスを入れる"

    実行元のshellはそのまま残り、`bash` だけが新しい名前空間へ入る。`exit` で子のshellを終了すると、そこにしか所属していない名前空間も通常は消える。このため、最初の実験はホストへ恒久的な設定を残しにくい。

`--fork` が必要なのは、PID namespace の最初の子プロセスを PID 1 にするためである。`--mount-proc` は新しい mount namespace に `/proc` をマウントする。これがないと `ps` や `/proc/self` が親側のPID空間を反映し、観測結果が混乱する。

起動した shell の中で確認する。

```bash
id
echo "inside PID: $$"
readlink /proc/$$/ns/pid
readlink /proc/$$/ns/net
ps -ef
ip link show
```

典型的には `id` が `uid=0(root)`、`$$` が `1` になる。ただし `ip link show` の `lo` は存在しても初期状態では DOWN であり、外部向け NIC・IPアドレス・デフォルト経路は自動では作られない。この段階で作られたのは「別の見え方」であり、ファイルの公開範囲や資源上限まで完成したわけではない。

名前空間は、所属プロセスがすべて終了すると通常は消える。`unshare` を終了すると、この最小実験で作った名前空間も破棄される。

## 2. ファイルシステムを組み立てる

新しい mount namespace を作っただけでは、ホストの mount 構成をコピーして見ている。ホストの変更を外へ伝播させない設定を先に行い、その後で必要なパスだけを bind mount する。

以下は前節で起動した shell の中で実行する例である。`$PROJECT` はホスト側で作業対象を指している必要がある。学習用に、同じディレクトリを読み取り専用と書き込み可能の2通りで示す。

```bash
# mountの変更を親namespaceへ伝播させない
mount --make-rprivate /

# Sandbox内だけの一時領域を作る
mkdir -p /sandbox/workspace /sandbox/tmp
mount -t tmpfs -o size=64m tmpfs /sandbox/tmp

# 作業ディレクトリを公開する
mount --bind "$PROJECT" /sandbox/workspace

# 読み取り専用として公開する場合
mount -o remount,bind,ro /sandbox/workspace

findmnt -T /sandbox/workspace
findmnt -T /sandbox/tmp
```

この結果、`/sandbox/tmp` には最大64 MiBの新しい tmpfs mount が作られ、namespaceを終了すれば消える。`/sandbox/workspace` は新しいファイルコピーではなく、`$PROJECT` と同じ inode を参照する bind mount である。`ro` への remount 後は、Sandbox内の `touch /sandbox/workspace/new.txt` は `Read-only file system` で失敗する。

ただし、この例だけでは `/home` や `/etc` などの既存パスはまだ見えている。実用的なランタイムは、準備済みの root filesystem を `chroot` または `pivot_root` で新しい `/` にし、そこへ `/workspace`、`/tmp`、必要最小限の `/proc`・`/dev` だけを mount する。`chroot` 単体は権限境界ではない。user namespace、mount namespace、system call制限と組み合わせて初めて隔離層の一部になる。

!!! tip "補足: bind mountはコピーではなく入口を増やす"

    `mount --bind` は、同じファイル・ディレクトリを別のパスから見えるようにする。コピーを作る操作ではないため、読み取り専用にしなければSandbox側の変更が元の `$PROJECT` に届く。`chroot` は住所表示を変える部品であり、権限やネットワークまで自動で制限しない。

## 3. ネットワークを「何もつながない」状態から作る

`unshare --net` 直後は、別のネットワークスタックができるが、外部通信できる線はつながっていない。通信不要のSandboxなら、loopbackを上げるだけでよい。

```bash
# 前節のSandbox内
ip link set lo up
ip addr show lo
ip route
```

この状態では `localhost` 内のプロセス同士は通信できるが、デフォルト経路がないためインターネットへは出られない。これは「通信を禁止する」実装の一形態である。

外部ではなくホスト側とだけ疎通させたい場合、管理者は veth（仮想Ethernetの対）を作り、片方を namespace へ移す。次の例は root が必要で、テスト用の閉じた `/30` 相当のネットワークだけを作る。

```bash
# ホスト側。名前付きnetwork namespaceを作る
sudo ip netns add wiki-sandbox
sudo ip link add veth-host type veth peer name veth-sandbox
sudo ip link set veth-sandbox netns wiki-sandbox

# ホスト側の端点を設定する
sudo ip addr add 192.0.2.1/24 dev veth-host
sudo ip link set veth-host up

# Sandbox側の端点とloopbackを設定する
sudo ip netns exec wiki-sandbox ip addr add 192.0.2.2/24 dev veth-sandbox
sudo ip netns exec wiki-sandbox ip link set veth-sandbox up
sudo ip netns exec wiki-sandbox ip link set lo up
sudo ip netns exec wiki-sandbox ip route
```

`ip netns add` は namespace を名前で管理できるよう `/var/run/netns/wiki-sandbox` に参照を残す。`veth-host` と `veth-sandbox` は一対の仮想NICで、片方へ送ったフレームがもう片方へ届く。この例にはデフォルト経路もNATも設定していないため、外部インターネットには到達しない。

```bash
# 後片付け。veth-hostを消すと対になるveth-sandboxも消える
sudo ip link del veth-host
sudo ip netns del wiki-sandbox
```

本番ではこの後に firewall、プロキシ、宛先allowlist、DNS設定を重ねる。vethを作っただけで通信を安全に制御したことにはならない。

!!! tip "補足: vethは配線であり、通信許可ではない"

    vethは仮想的なLANケーブルの両端である。default routeやNATを追加すると外部へ出られるようになるため、どこまでつなぐかをネットワーク設定とFirewallで別途決める。

## 4. cgroupで使える量を渡す

namespace は資源消費を制限しない。cgroup v2 はプロセスをディレクトリ状のグループへ入れ、そのグループに上限を設定する。以下では短命な `sleep` だけを移動する。親のログインshellを移動すると、自分の操作まで制限されるため避ける。

```bash
# 管理者権限とcgroup v2が必要
sudo mkdir /sys/fs/cgroup/wiki-sandbox
echo 50000000 | sudo tee /sys/fs/cgroup/wiki-sandbox/memory.max  # 50 MB
echo 20       | sudo tee /sys/fs/cgroup/wiki-sandbox/pids.max    # 最大20プロセス

sleep 600 &
child_pid=$!
echo "$child_pid" | sudo tee /sys/fs/cgroup/wiki-sandbox/cgroup.procs

cat /sys/fs/cgroup/wiki-sandbox/cgroup.procs
cat /sys/fs/cgroup/wiki-sandbox/memory.max
cat /sys/fs/cgroup/wiki-sandbox/pids.max
```

`mkdir` により cgroup が1つ生成され、`cgroup.procs` に PID を書くと、そのプロセスが移動する。`memory.max` はメモリのhard limit、`pids.max` は同時に存在できるプロセス数の上限である。利用できるcontrollerは親cgroupから有効化・委譲されていなければならず、常に一般ユーザーが作成できるものではない。

!!! tip "補足: cgroupはプロセス用の予算表"

    ここで制限するのはディレクトリ自体ではなく、そのディレクトリに所属するPIDである。同じプログラムでもcgroupへ移す前に使った資源と、移した後に使える資源は分けて考える。

```bash
kill "$child_pid"
sudo rmdir /sys/fs/cgroup/wiki-sandbox
```

上限に達した結果は制御種別で異なる。メモリ不足ではOOM killが起き得るため、`memory.events` の `oom_kill` を確認する。PID上限では新しい `fork()` や `clone()` が失敗する。

## 5. seccompで操作そのものを拒否する

mountやcgroupを設定しても、許可されたプロセスは多くの system call を発行できる。seccomp filter はカーネルに読み込ませる規則で、特定の system call を `EPERM` などで拒否できる。

次は libseccomp を使い、現在のプロセスからの `connect()` だけを拒否する最小例である。既定を許可にしているため、本番用の完全なポリシーではない。どの操作が通信開始になるかを観測するための実験である。

```c
// block-connect.c
#include <errno.h>
#include <arpa/inet.h>
#include <seccomp.h>
#include <stdio.h>
#include <sys/socket.h>

int main(void) {
  scmp_filter_ctx ctx = seccomp_init(SCMP_ACT_ALLOW);
  if (ctx == NULL) return 1;
  if (seccomp_rule_add(ctx, SCMP_ACT_ERRNO(EPERM), SCMP_SYS(connect), 0) < 0)
    return 2;
  if (seccomp_load(ctx) < 0) return 3;

  int fd = socket(AF_INET, SOCK_STREAM, 0);
  struct sockaddr_in addr = {.sin_family = AF_INET, .sin_port = htons(443)};
  inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);
  if (connect(fd, (struct sockaddr *)&addr, sizeof(addr)) < 0)
    perror("connect");  // 期待値: Operation not permitted
  seccomp_release(ctx);
}
```

```bash
# Debian/Ubuntu系の例。開発用パッケージが必要
cc -Wall -Wextra block-connect.c -lseccomp -o block-connect
./block-connect
```

`seccomp_load()` が成功すると、フィルタはそのプロセスと以後の子プロセスに適用される。元の shell や別のプロセスに遡って適用されることはない。既定を拒否する本番ポリシーは、動的リンカ、標準I/O、シグナル処理などに必要な system call まで洗い出す必要があるため、実行ログとテストを基に段階的に作る。

!!! tip "補足: seccompはアプリの命令を途中で検査する"

    プログラムはファイルを開く、通信する、といった操作をsystem callとしてカーネルへ依頼する。seccompはその依頼を実行前に照合する。`connect()`を拒否しても、ファイル読み書きまで自動で拒否されるわけではない。

## 実用ランタイムとの違い

ここまでのコマンドは、各層を観察するための部品実験である。コンテナランタイムやSandbox実行基盤は通常、次の責務も持つ。

| ランタイムの仕事 | 手作業の例 | 省略すると起きること |
| --- | --- | --- |
| rootfsを準備する | イメージ展開、`pivot_root`、必要なbind mount | ホストの多くのパスが見える |
| namespaceを作りPID 1を監督する | `clone()` / `unshare --fork`、終了処理 | 子プロセスやzombieが残る |
| UID/GIDを割り当てる | `/proc/<pid>/uid_map`、subuid/subgid | 内側rootとホスト権限の対応を誤る |
| 通信経路を作る・閉じる | veth、route、firewall、proxy | 意図しない外部通信または通信不能 |
| 資源を回収する | cgroup削除、mount解除、namespace終了 | プロセス・mount・資源が残る |
| 監査可能にする | 起動引数、許可操作、ログを記録 | 何が実行されたか追跡できない |

つまりSandboxの作成は「コマンドを安全にする」処理ではなく、プロセスを起動する前にOSの複数の台帳へ設定を書き込む初期化処理である。どの台帳に何を設定したかを `readlink /proc/.../ns/*`、`findmnt`、`ip netns`、`/sys/fs/cgroup`、`/proc/<pid>/status` で観測する。

## 関連記事と一次資料

- [Sandboxの内部：OSが境界を作る仕組み](sandbox-internals.md)
- [ネームスペース：プロセスごとに見える世界を分ける](namespaces.md)
- [Linux man-pages: unshare(1)](https://man7.org/linux/man-pages/man1/unshare.1.html)
- [Linux man-pages: ip-netns(8)](https://man7.org/linux/man-pages/man8/ip-netns.8.html)
- [Linux kernel documentation: Control Group v2](https://docs.kernel.org/admin-guide/cgroup-v2.html)
- [libseccomp API documentation](https://libseccomp.readthedocs.io/en/latest/)

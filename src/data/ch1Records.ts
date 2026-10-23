import type { JEntry } from './journal'

/** 챕터 1 화요일 첫 만남(v2c1_tue)의 인물 기록. 해리가 직접 본 것(observed)과 들은 것·인상(impression)만, 해리가 고른 행동에 따라 달라진다. */
const O = (when: string, text: string): JEntry => ({ sec: 'observed', when, text })
const I = (when: string, text: string, prio = 0): JEntry => ({ sec: 'impression', when, text, prio })

export const JOURNAL_CH1: Record<string, JEntry[]> = {
  hermione: [
    O('FLAG_C1_HER_RESPECT', '초안의 약한 단락을 짚자 "기분 나쁜 것과 틀린 말을 구분하는 게 내 일"이라고 하며 줄을 그었다. 판단은 인정했지만 그만큼 가깝다는 뜻은 아니었다.'),
    O('FLAG_C1_HER_PERSONAL', '틀려도 괜찮다고 하자 열두 번 고쳐 쓴 첫 문단을 처음으로 보여 줬다. 평가하지 말고 읽기만 해 달라고 했다.'),
  ],
  ginny: [
    O('FLAG_C1_GIN_BET', '내기를 걸자 조건 하나를 달고 받았다. 졌을 때는 졌다고 말하고 새벽 달리기에서 내 가방을 들었다. 오빠가 이긴 거지 내가 이긴 게 아니라고 선을 그었다.'),
  ],
  luna: [
    O('FLAG_C1_LUNA_LISTENED', '호숫가에서 같이 일곱까지 셌다. 일곱에서 성 쪽 기슭에서 시작한 파문이 하나 번졌다. 바람은 없었다.'),
    O('FLAG_C1_LUNA_ASKED', '소리가 어디서 나는지 묻자, 성의 서쪽 높은 곳에서 내려와 호수에서 한 번 굽어진다고 했다. 본인도 정확하지 않다고 했다.'),
    O('FLAG_C1_LUNA_DOUBTED', '네가 만든 소리 아니냐고 하자 화내지 않았다. 의심하는 사람이 더 정확히 듣는다고 했다. 말포이의 걸음에 대한 말은 틀렸을 수도 있다고 덧붙였다.'),
    O('FLAG_C1_LUNA_LATER', '내일 다시 들르겠다고 말하고 자리를 떴다. 그녀는 붙잡지 않았다.'),
    I('FLAG_C1_LUNA_LISTENED', '내 이름보다 걸음을 먼저 알아봤다. 혼자가 아니라는 확인을 받은 뒤에야 처음으로 내 쪽을 똑바로 봤다.', 5),
  ],
  pansy: [
    O('FLAG_C1_PAN_SHARED', '도서관 앞 복도에서 서로 아는 걸 한 번에 하나씩 교환했다. 걔가 올여름부터 가문의 편지를 열지 않고 서랍에 넣는다고 했다.'),
    O('FLAG_C1_PAN_ASKED_FIRST', '먼저 내놓으라고 되받자 "느리다"고 하며 점심을 안 먹는다는 한 줄을 공짜로 주었다.'),
    O('FLAG_C1_PAN_DECLINED', '직접 듣겠다고 거절하자 "정직한 거절은 받아 둔다"고 했다. 먼저 말할 일은 없을 거라고 덧붙였다.'),
    I('FLAG_C1_LEAKED_LETTER', '내가 서랍 속 편지 얘기를 걔 앞에서 꺼냈다. 출처가 하나로 좁혀졌다는 걸 안다. 이제 그녀가 나를 어떻게 부를지는 그녀가 정한다.', 7),
    I('FLAG_C1_PAN_SHARED || FLAG_C1_PAN_ASKED_FIRST || FLAG_C1_PAN_DECLINED', '같은 사람을 세고 있지만 이유가 다르다. 걔가 무너지면 제일 먼저 맞는 사람이 자기라고 했다.', 4),
  ],
}

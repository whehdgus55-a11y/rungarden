import { createRunLog } from "@/app/actions";

type RunFormProps = {
  plantName: string;
};

export function RunForm({ plantName }: RunFormProps) {
  return (
    <form action={createRunLog} className="run-form">
      <input type="hidden" name="plant_name" value={plantName} />
      <label>
        <span>러닝 거리</span>
        <div className="unit-input">
          <input name="distance_km" type="number" min="0.1" max="100" step="0.1" placeholder="3.2" required />
          <strong>km</strong>
        </div>
      </label>
      <label>
        <span>운동 시간</span>
        <div className="unit-input">
          <input name="duration_min" type="number" min="1" max="600" step="1" placeholder="25" />
          <strong>분</strong>
        </div>
      </label>
      <label className="wide-field">
        <span>메모</span>
        <input name="memo" type="text" maxLength={160} placeholder="예: 학교 주변 2바퀴, 컨디션 좋음" />
      </label>
      <button className="primary-button" type="submit">
        성장에 반영
      </button>
    </form>
  );
}

export class ResourcesBarComponent {
	chipsCount = document.getElementById('chips-count');
	datasCount = document.getElementById('datas-count');
	modelsCount = document.getElementById('models-count');
	engineersCount = document.getElementById('engineers-count');

	update(resources) {
		this.chipsCount.textContent = Math.round(resources[1].chips);
		this.datasCount.textContent = Math.round(resources[1].datas);
		this.modelsCount.textContent = Math.round(resources[1].models);
		this.engineersCount.textContent = Math.round(resources[1].engineers);
	}
}
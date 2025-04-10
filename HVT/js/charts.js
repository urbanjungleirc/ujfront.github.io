// js/charts.js
google.charts.load("current", { packages: ["corechart"] });
google.charts.setOnLoadCallback(drawChart);

function drawChart() {
    api.getResultsData()
        .then((results) => {
            const data = new google.visualization.DataTable();
            data.addColumn("string", "Climber");
            data.addColumn("number", "Score");
            results.sendTypes.forEach((type) => {
                data.addColumn("number", type.toUpperCase());
            });
            results.data.forEach((row) => data.addRow(row));
            const options = {
                title: "Climbing Session Results",
                hAxis: { title: "Climber" },
                vAxis: { title: "Score" },
                seriesType: "bars",
                series: { 0: { type: "line" } },
            };
            const chart = new google.visualization.ComboChart(
                document.getElementById("chartContainer")
            );
            chart.draw(data, options);
        })
        .catch((err) => console.error(err));
}

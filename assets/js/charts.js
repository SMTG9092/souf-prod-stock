/**
 * ============================================================
 * SoufStock Enterprise ERP
 * charts.js
 * ============================================================
 */

import Api from "./api.js";
import { Toast } from "./utils.js";

class ChartsManager {

    constructor() {

        this.charts = {};

    }

    /* ============================================================
     * INIT
     * ============================================================
     */

    async init() {

        try {

            await Promise.all([

                this.loadStockChart(),

                this.loadCommandesChart()

            ]);

        }

        catch (error) {

            console.error(error);

            Toast.error(

                "Charts",

                error.message

            );

        }

    }

    /* ============================================================
     * DESTROY
     * ============================================================
     */

    destroy(name) {

        if (this.charts[name]) {

            this.charts[name].destroy();

            delete this.charts[name];

        }

    }

    /* ============================================================
     * STOCK
     * ============================================================
     */

    async loadStockChart() {

        this.destroy("stock");

        const rows = await Api.select(

            "stock",

            "magasin,quantite"

        );

        const data = {};

        rows.forEach(row => {

            const magasin = row.magasin || "N/A";

            data[magasin] =

                (data[magasin] || 0)

                +

                Number(row.quantite || 0);

        });

        const canvas =

            document.getElementById(

                "stockChart"

            );

        if (!canvas) return;

        this.charts.stock = new Chart(

            canvas,

            {

                type: "bar",

                data: {

                    labels:

                        Object.keys(data),

                    datasets: [

                        {

                            label: "Stock",

                            data:

                                Object.values(data),

                            borderWidth: 1,

                            borderRadius: 8

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {

                            display: true

                        }

                    }

                }

            }

        );

    }

    /* ============================================================
     * COMMANDES
     * ============================================================
     */

    async loadCommandesChart() {

        this.destroy("commandes");

        const rows = await Api.select(

            "commandes_excel",

            "statut"

        );

        const data = {};

        rows.forEach(row => {

            const statut =

                row.statut || "N/A";

            data[statut] =

                (data[statut] || 0)

                + 1;

        });

        const canvas =

            document.getElementById(

                "commandesChart"

            );

        if (!canvas) return;

        this.charts.commandes =

            new Chart(

                canvas,

                {

                    type: "doughnut",

                    data: {

                        labels:

                            Object.keys(data),

                        datasets: [

                            {

                                data:

                                    Object.values(data)

                            }

                        ]

                    },

                    options: {

                        responsive: true,

                        maintainAspectRatio: false

                    }

                }

            );

    }

    /* ============================================================
     * REFRESH
     * ============================================================
     */

    async refresh() {

        await this.init();

    }

    /* ============================================================
     * DESTROY ALL
     * ============================================================
     */

    destroyAll() {

        Object.keys(this.charts)

            .forEach(key => {

                this.destroy(key);

            });

    }

}

const Charts = new ChartsManager();

export default Charts;
